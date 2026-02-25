import { propsValidation } from '@activepieces/pieces-common';
import {
  createAction,
  DynamicPropsValue,
  Property,
  StoreScope,
} from '@activepieces/pieces-framework';
import Anthropic, { APIError } from '@anthropic-ai/sdk';
import { ContentBlockParam, MessageParam, TextBlock } from '@anthropic-ai/sdk/resources';
import { z } from 'zod';
import { promptxAuth } from '../../index';
import {
  addTokenUsage,
  billingIssueMessage,
  getAccessToken,
  getAiApiKey,
  getAnthropicModelOptions,
  getStoreData,
  getUsagePlan,
} from '../common/common';

const DEFAULT_TOKENS_FOR_THINKING_MODE = 1024;

export const askClaude = createAction({
  auth: promptxAuth,
  name: 'ask_claude',
  displayName: 'Ask Claude',
  description: 'Ask Claude anything you want!',
  props: {
    model: Property.StaticDropdown({
      displayName: 'Model',
      required: true,
      description:
        'The model which will generate the completion. Some models are suitable for natural language tasks, others specialize in code.',
      defaultValue: 'claude-3-haiku-20240307',
      options: {
        disabled: false,
        options: getAnthropicModelOptions(),
      },
    }),
    systemPrompt: Property.LongText({
      displayName: 'System Prompt',
      required: false,
      defaultValue: "You're a helpful assistant.",
    }),
    temperature: Property.Number({
      displayName: 'Temperature',
      required: false,
      description:
        'Controls randomness: Lowering results in less random completions. As the temperature approaches zero, the model will become deterministic and repetitive.',
    }),
    maxTokens: Property.Number({
      displayName: 'Maximum Tokens',
      required: false,
      description:
        "The maximum number of tokens to generate. Requests can use up to 2,048 or 4,096 tokens shared between prompt and completion, don't set the value to maximum and leave some tokens for the input. The exact limit varies by model. (One token is roughly 4 characters for normal English text)",
    }),
    prompt: Property.LongText({
      displayName: 'Question',
      required: true,
    }),
    image: Property.File({
      displayName: 'Image (URL)',
      required: false,
      description: 'URL of image to be used as input for the model.',
    }),
    memoryKey: Property.ShortText({
      displayName: 'Memory Key',
      description:
        'A memory key that will keep the chat history. Keep it empty to leave Gemini without memory of previous messages.',
      required: false,
    }),
    thinkingMode: Property.Checkbox({
      displayName: 'Extended Thinking Mode',
      required: false,
      defaultValue: false,
      description:
        'Uses claude 3.7 sonnet enhanced reasoning capabilities for complex tasks.',
    }),
    thinkingModeParams: Property.DynamicProperties({
      auth: promptxAuth,
      displayName: 'Thinking Parameters',
      refreshers: ['thinkingMode'],
      required: false,
      props: async ({ auth, thinkingMode }) => {
        if (!auth || !thinkingMode) return {};

        const props: DynamicPropsValue = {};

        props['budgetTokens'] = Property.Number({
          displayName: 'Budget Tokens',
          required: true,
          defaultValue: DEFAULT_TOKENS_FOR_THINKING_MODE,
          description:
            'This parameter determines the maximum number of tokens Claude is allowed to use for its internal reasoning process.Your budget tokens must always be less than the max tokens specified.',
        });

        return props;
      },
    }),
  },
  async run(context) {
    const { auth, propsValue, flows, store, project } = context;
    const { server, username, password } = auth.props;

    const accessToken = await getAccessToken(server, username, password);

    const apiKey = await getAiApiKey(
      context.server.apiUrl,
      context.server.token
    );

    const { userId } = await getStoreData(store, server, accessToken as string);

    const usage = await getUsagePlan(server, accessToken as string);

    // check token is available
    if (propsValue.maxTokens && propsValue.maxTokens > usage.token_available) {
      throw new Error(billingIssueMessage);
    }

    await propsValidation.validateZod(propsValue, {
      memoryKey: z.string().max(128).optional(),
      temperature: z.number().min(0).max(1.0).optional(),
    });

    const anthropic = new Anthropic({ apiKey });

    let model = 'claude-3-haiku-20240307';

    if (propsValue.model) {
      model = propsValue.model;
    }

    let temperature = 0.5;
    if (propsValue.temperature) {
      temperature = Number(propsValue.temperature);
    }
    // if token available less than 1000, will use as maxToken
    let maxTokens = usage.token_available > 1000 ? 1000 : usage.token_available;
    if (propsValue.maxTokens) {
      maxTokens = Number(propsValue.maxTokens);
    }
    let systemPrompt = 'You are a helpful assistant.';
    if (propsValue.systemPrompt) {
      systemPrompt = propsValue.systemPrompt;
    }

    const contents: ContentBlockParam[] = [];

    if (propsValue.prompt) {
      contents.push({ type: 'text', text: propsValue.prompt });
    }

    let history: MessageParam[] = [];
    if (propsValue.memoryKey) {
      const storedHistory = await store.get(propsValue.memoryKey, StoreScope.PROJECT);
      if (Array.isArray(storedHistory)) {
        history = storedHistory;
      }
    }

    if (propsValue.image) {
      let imageMediaType:
        | 'image/jpeg'
        | 'image/png'
        | 'image/gif'
        | 'image/webp' = 'image/jpeg';
      switch (propsValue.image?.extension) {
        case 'jpg':
          imageMediaType = 'image/jpeg';
          break;
        case 'png':
          imageMediaType = 'image/png';
          break;
        case 'gif':
          imageMediaType = 'image/gif';
          break;
        case 'webp':
          imageMediaType = 'image/webp';
          break;
      }
      contents.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: imageMediaType,
          data: propsValue.image.data.toString(),
        },
      });
    }

    history.push({ role: 'user', content: contents });

    let response: string | undefined;
    let responseWithTokens: Anthropic.Messages.Message;

    try {
      if (propsValue.thinkingMode) {
        const budgetTokens = propsValue.thinkingModeParams
          ? propsValue.thinkingModeParams['budgetTokens']
          : 1024;

        const req = await anthropic.messages.create({
          model: model ?? 'claude-3-7-sonnet-20250219',
          max_tokens: maxTokens,
          system: systemPrompt,
          thinking: {
            type: 'enabled',
            budget_tokens: budgetTokens ?? DEFAULT_TOKENS_FOR_THINKING_MODE,
          },
          messages: history,
        });
        responseWithTokens = req;
        response = req.content.filter((block) => block.type === 'text')[0].text;
      } else {
        const req = await anthropic.messages.create({
          model: model,
          max_tokens: maxTokens,
          temperature: temperature,
          system: systemPrompt,
          messages: history,
        });
        responseWithTokens = req;
        response = (req?.content[0] as TextBlock).text;
      }

      if (propsValue.memoryKey) {
        history.push({ role: 'assistant', content: response });
        await store.put(propsValue.memoryKey, history, StoreScope.PROJECT);
      }

      if (responseWithTokens) {
        const inputTokens = responseWithTokens.usage.input_tokens;
        const outputTokens = responseWithTokens.usage.output_tokens;
        const totalTokens = inputTokens + outputTokens;
        await addTokenUsage(
          {
            userId: `${userId}`,
            model: responseWithTokens.model,
            projectId: project.id,
            flowId: flows.current.id,
            component: 'Automationx',
            usage: {
              inputTokens,
              outputTokens,
              totalTokens,
            },
          },
          server,
          accessToken as string
        );
      }
    } catch (e) {
      if (e instanceof APIError) {
        // Refer https://platform.claude.com/docs/en/api/errors
        throw new Error(JSON.stringify(e.error));
      } else {
        throw e;
      }
    }

    return response;
  },
});
