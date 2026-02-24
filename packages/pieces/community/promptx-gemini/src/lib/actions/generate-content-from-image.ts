import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { nanoid } from 'nanoid';
import { Property, createAction } from '@activepieces/pieces-framework';
import {
  billingIssueMessage,
  defaultLLM,
  getGeminiModelOptions,
  promptxAuth,
} from '../common/common';
import {
  addTokenUsage,
  getAccessToken,
  getAiApiKey,
  getStoreData,
  getUsagePlan,
  PromptXAuthType,
} from '../common/pmtx-api';

export const generateContentFromImageAction = createAction({
  description:
    'Generate content using Google Gemini using the "gemini-pro-vision" model',
  displayName: 'Generate Content from Image',
  name: 'generate_content_from_image',
  auth: promptxAuth,
  props: {
    prompt: Property.LongText({
      displayName: 'Prompt',
      required: true,
      description: 'The prompt to generate content from.',
    }),
    image: Property.File({
      displayName: 'Image',
      required: true,
      description: 'The image to generate content from.',
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
    const tempFilePath = join(
      tmpdir(),
      `gemini-image-${nanoid()}.${propsValue.image.extension}`
    );

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

    try {
      const imageBuffer = Buffer.from(propsValue.image.base64, 'base64');
      await fs.writeFile(tempFilePath, imageBuffer);
      const geminiKey: string = await getAiApiKey(
        context.server.apiUrl,
        context.server.token
      );
      const fileManager = new GoogleAIFileManager(geminiKey);
      const uploadResult = await fileManager.uploadFile(tempFilePath, {
        mimeType: `image/${propsValue.image.extension}`,
        displayName: propsValue.image.filename,
      });

      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: propsValue.model });
      const result = await model.generateContent([
        propsValue.prompt,
        {
          fileData: {
            fileUri: uploadResult.file.uri,
            mimeType: uploadResult.file.mimeType,
          },
        },
      ]);

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

      return {
        text: result.response.text(),
        raw: result.response,
      };
    } catch (error) {
      console.error('Error in generate content from image:', error);
      throw error;
    } finally {
      await fs.unlink(tempFilePath).catch(() => void 0);
    }
  },
});
