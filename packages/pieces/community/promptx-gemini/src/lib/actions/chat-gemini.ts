import { Content, GoogleGenerativeAI } from '@google/generative-ai';
import {
  Property,
  StoreScope,
  createAction,
} from '@activepieces/pieces-framework';
import { z } from 'zod';
import {
  billingIssueMessage,
  defaultLLM,
  getGeminiModelOptions,
  promptxAuth,
} from '../common/common';
import { propsValidation } from '@activepieces/pieces-common';
import {
  addTokenUsage,
  getAccessToken,
  getAiApiKey,
  getStoreData,
  getUsagePlan,
  PromptXAuthType,
} from '../common/pmtx-api';

export const chatGemini = createAction({
  auth: promptxAuth,
  name: 'chat_gemini',
  displayName: 'Chat Gemini',
  description: 'Chat with Google Gemini',
  props: {
    model: Property.StaticDropdown({
      displayName: 'Model',
      required: true,
      description: 'The model which will generate the completion',
      defaultValue: defaultLLM,
      options: {
        disabled: false,
        options: getGeminiModelOptions(),
      },
    }),
    prompt: Property.LongText({
      displayName: 'Prompt',
      required: true,
      description: 'The prompt to generate content from.',
    }),
    memoryKey: Property.ShortText({
      displayName: 'Memory Key',
      description:
        'A memory key that will keep the chat history. Keep it empty to leave Gemini without memory of previous messages.',
      required: false,
    }),
  },
  async run(context) {
    const { auth, propsValue, store, project, flows } = context;
    const { model, prompt, memoryKey } = propsValue;

    await propsValidation.validateZod(propsValue, {
      memoryKey: z.string().max(128).optional(),
    });

    const pxAuth: PromptXAuthType = {
      username: auth.props.username,
      password: auth.props.password,
      server: auth.props.server === 'production' ? 'production' : 'staging',
    };

    const accessToken = await getAccessToken(pxAuth);
    const currentUsage = await getUsagePlan(pxAuth.server, accessToken);
    const { userId } = await getStoreData(store, pxAuth.server, accessToken);

    // check token is available
    if (currentUsage.token_available <= 0) {
      throw new Error(billingIssueMessage);
    }

    const geminiKey = await getAiApiKey(
      context.server.apiUrl,
      context.server.token
    );

    const genAI = new GoogleGenerativeAI(geminiKey);
    const geminiModel = genAI.getGenerativeModel({ model });

    let history: Content[] = [];

    if (memoryKey) {
      const storedHistory = await store.get(memoryKey, StoreScope.PROJECT);
      if (Array.isArray(storedHistory)) {
        history = storedHistory;
      }
    }

    const chat = geminiModel.startChat({
      history: history,
    });

    const result = await chat.sendMessage(prompt);
    const responseText = result.response.text();

    if (memoryKey) {
      const updatedHistory = await chat.getHistory();
      await store.put(memoryKey, updatedHistory, StoreScope.PROJECT);
    }

    const usage = result.response.usageMetadata;
    if (usage) {
      await addTokenUsage(
        {
          userId: `${userId}`,
          model,
          projectId: project.id,
          flowId: flows.current.id,
          component: 'Automationx',
          usage: {
            inputTokens: usage.promptTokenCount,
            outputTokens: usage.totalTokenCount - usage.promptTokenCount,
            totalTokens: usage.totalTokenCount,
          },
        },
        pxAuth.server,
        accessToken
      );
    }

    return {
      response: responseText,
      history: history,
    };
  },
});
