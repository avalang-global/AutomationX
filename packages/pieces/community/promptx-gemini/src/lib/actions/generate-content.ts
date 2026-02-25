import { Property, createAction } from '@activepieces/pieces-framework';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  addTokenUsage,
  getAccessToken,
  getAiApiKey,
  getStoreData,
  getUsagePlan,
  PromptXAuthType,
} from '../common/pmtx-api';
import {
  billingIssueMessage,
  defaultLLM,
  getGeminiModelOptions,
  promptxAuth,
} from '../common/common';

export const generateContentAction = createAction({
  description:
    'Generate content using Google Gemini using the "gemini-pro" model',
  displayName: 'Generate Content',
  name: 'generate_content',
  auth: promptxAuth,
  props: {
    prompt: Property.LongText({
      displayName: 'Prompt',
      required: true,
      description: 'The prompt to generate content from.',
    }),
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
  },
  async run(context) {
    const { auth, propsValue, store, project, flows } = context;
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
    const geminiKey: string = await getAiApiKey(
      context.server.apiUrl,
      context.server.token
    );
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: propsValue.model });
    const result = await model.generateContent(propsValue.prompt);
    const usage = result.response.usageMetadata;
    if (usage) {
      await addTokenUsage(
        {
          userId: `${userId}`,
          model: propsValue.model,
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
    return result.response.text();
  },
});
