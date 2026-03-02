import {
  createAction,
  Property,
  StoreScope,
} from '@activepieces/pieces-framework';
import OpenAI from 'openai';
import { promptxAuth } from '../..';
import {
  billingIssueMessage,
  calculateMessagesTokenSize,
  exceedsHistoryLimit,
  reduceContextSize,
} from '../common/common';
import { z } from 'zod';
import { propsValidation } from '@activepieces/pieces-common';
import {
  addTokenUsage,
  getAccessToken,
  getAiApiKey,
  getOpenAiModelOptions,
  getStoreData,
  getUsagePlan,
  PromptXAuthType,
} from '../common/pmtx-api';
import { APIError } from 'openai/error';
import { ChatCompletion, ChatCompletionMessageParam } from 'openai/resources';

export const askOpenAI = createAction({
  auth: promptxAuth,
  name: 'ask_chatgpt',
  displayName: 'Ask ChatGPT',
  description: 'Ask ChatGPT anything you want!',
  props: {
    model: Property.StaticDropdown({
      displayName: 'Model',
      required: true,
      description:
        'The model which will generate the completion. Some models are suitable for natural language tasks, others specialize in code.',
      defaultValue: 'gpt-4.1-mini',
      options: {
        disabled: false,
        options: getOpenAiModelOptions(),
      },
    }),
    prompt: Property.LongText({
      displayName: 'Question',
      required: true,
    }),
    temperature: Property.Number({
      displayName: 'Temperature',
      required: false,
      description:
        'Controls randomness: Lowering results in less random completions. As the temperature approaches zero, the model will become deterministic and repetitive.',
      defaultValue: 0,
    }),
    maxTokens: Property.Number({
      displayName: 'Maximum Tokens',
      required: true,
      description:
        "The maximum number of tokens to generate. Requests can use up to 2,048 or 4,096 tokens shared between prompt and completion depending on the model. Don't set the value to maximum and leave some tokens for the input. (One token is roughly 4 characters for normal English text)",
      defaultValue: 2048,
    }),
    topP: Property.Number({
      displayName: 'Top P',
      required: false,
      description:
        'An alternative to sampling with temperature, called nucleus sampling, where the model considers the results of the tokens with top_p probability mass. So 0.1 means only the tokens comprising the top 10% probability mass are considered.',
      defaultValue: 1,
    }),
    frequencyPenalty: Property.Number({
      displayName: 'Frequency penalty',
      required: false,
      description:
        "Number between -2.0 and 2.0. Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim.",
      defaultValue: 0,
    }),
    presencePenalty: Property.Number({
      displayName: 'Presence penalty',
      required: false,
      description:
        "Number between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far, increasing the mode's likelihood to talk about new topics.",
      defaultValue: 0.6,
    }),
    memoryKey: Property.ShortText({
      displayName: 'Memory Key',
      description:
        'A memory key that will keep the chat history shared across runs and flows. Keep it empty to leave ChatGPT without memory of previous messages.',
      required: false,
    }),
    roles: Property.Json({
      displayName: 'Roles',
      required: false,
      description: 'Array of roles to specify more accurate response',
      defaultValue: [
        { role: 'system', content: 'You are a helpful assistant.' },
      ],
    }),
    website: Property.ShortText({
      displayName: 'Website Domains',
      description:
        'Website domains to search (multiple websites separated by commas, e.g., "example.com, github.com"). Leave empty to use regular ChatGPT without web search.',
      required: false,
    }),
  },
  async run(context) {
    const { auth, propsValue, store, project, flows } = context;
    const {
      prompt,
      model,
      maxTokens,
      memoryKey,
      website,
      temperature,
      topP,
      frequencyPenalty,
      presencePenalty,
    } = propsValue;
    const pxAuth: PromptXAuthType = {
      server: auth.props.server === 'production' ? 'production' : 'staging',
      username: auth.props.username,
      password: auth.props.password,
    };
    const accessToken = await getAccessToken(pxAuth);
    const apiKey = await getAiApiKey(
      context.server.apiUrl,
      context.server.token
    );
    const usage = await getUsagePlan(pxAuth.server, accessToken);

    // Get store data
    const { userId } = await getStoreData(store, pxAuth.server, accessToken);
    await propsValidation.validateZod(propsValue, {
      memoryKey: z.string().max(128).optional(),
    });

    const openai = new OpenAI({ apiKey });

    // Check token is available
    if (maxTokens && maxTokens > usage.token_available) {
      throw new Error(billingIssueMessage);
    }

    await propsValidation.validateZod(propsValue, {
      temperature: z.number().min(0).max(1).optional(),
      memoryKey: z.string().max(128).optional(),
      website: z.string().optional(),
    });

    let messageHistory: ChatCompletionMessageParam[] = [];

    // If memory key is set, retrieve messages stored in history
    if (memoryKey) {
      messageHistory = (await store.get(memoryKey, StoreScope.PROJECT)) ?? [];
    }

    // Add user prompt to message history
    messageHistory.push({
      role: 'user',
      content: prompt,
    });

    // Add system instructions if set by user
    const propRoles = propsValue.roles as unknown as {
      role: string;
      content: string;
    }[];
    const rolesEnum = ['system', 'user', 'assistant'];
    const systemRoleMessages: ChatCompletionMessageParam[] = [];
    propRoles.forEach((item) => {
      if (!rolesEnum.includes(item.role)) {
        throw new Error(
          'The only available roles are: [system, user, assistant]'
        );
      }

      systemRoleMessages.push({
        role:
          item.role === 'system'
            ? 'system'
            : item.role === 'user'
            ? 'user'
            : 'assistant',
        content: item.content,
      });
    });

    let completion: ChatCompletion;

    if (website && website.trim()) {
      // Use web search functionality with responses.create
      const allowedDomains = website
        .split(',')
        .map((domain: string) => domain.trim())
        .filter((domain: string) => domain.length > 0);

      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          input: systemRoleMessages.concat(messageHistory),
          model: model,
          tools: [
            {
              type: 'web_search',
              filters: {
                allowed_domains: allowedDomains,
              },
            },
          ],
          include: ['web_search_call.action.sources'],
          reasoning: {
            effort: 'low',
          },
          tool_choice: 'auto',
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `Web search API request failed with status ${response.status}: ${errorData}`
        );
      }

      const result = await response.json();

      // Extract text content from the response output
      const responseContent =
        result.output
          ?.find((item: any) => item.type === 'message')
          ?.content?.find((content: any) => content.type === 'output_text')
          ?.text || 'No response content found';

      // Create a completion object for compatibility using actual usage data
      completion = {
        id: 'dummy',
        created: 0,
        model,
        object: 'chat.completion',
        choices: [
          {
            message: {
              role: 'assistant',
              content: responseContent,
              refusal: null,
            },
            logprobs: null,
            index: 0,
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: result.usage?.input_tokens || 0,
          completion_tokens: result.usage?.output_tokens || 0,
          total_tokens: result.usage?.total_tokens || 0,
        },
      };
    } else {
      // Send prompt using regular chat completion
      try {
        completion = await openai.chat.completions.create({
          model: model,
          messages: systemRoleMessages.concat(messageHistory),
          temperature: temperature,
          top_p: topP,
          frequency_penalty: frequencyPenalty,
          presence_penalty: presencePenalty,
          max_completion_tokens: Math.floor(maxTokens),
        });
      } catch (e) {
        if (e instanceof APIError) {
          throw new Error(JSON.stringify(e.error));
        }
        throw e;
      }
    }

    // Add response to message history
    messageHistory = [...messageHistory, completion.choices[0].message];

    // Check message history token size
    // System limit is 32K tokens, we can probably make it bigger but this is a safe spot
    const tokenLength = await calculateMessagesTokenSize(messageHistory, model);
    if (memoryKey) {
      // If tokens exceed 90% system limit or 90% of model limit - maxTokens, reduce history token size
      if (exceedsHistoryLimit(tokenLength, model, maxTokens)) {
        messageHistory = await reduceContextSize(
          messageHistory,
          model,
          maxTokens
        );
      }
      // Store history
      await store.put(memoryKey, messageHistory, StoreScope.PROJECT);
    }

    // update token usage data for the user
    await addTokenUsage(
      {
        userId: `${userId}`,
        model: model,
        projectId: project.id,
        flowId: flows.current.id,
        component: 'Automationx',
        usage: {
          inputTokens: completion.usage?.prompt_tokens ?? 0,
          outputTokens: completion.usage?.completion_tokens ?? 0,
          totalTokens: completion.usage?.total_tokens ?? 0,
        },
      },
      pxAuth.server,
      accessToken
    );

    return completion.choices[0].message.content;
  },
});
