import {
  createAction,
  Property,
} from '@activepieces/pieces-framework';
import { promptxAuth } from '../..';
import {
  getAccessToken,
  getAiApiKey,
  PromptXAuthType,
} from '../common/pmtx-api';
import { z } from 'zod';
import { propsValidation } from '@activepieces/pieces-common';

export const searchWebsite = createAction({
  auth: promptxAuth,
  name: 'search_website',
  displayName: 'Search Website',
  description: 'Search specific websites using ChatGPT with web search capabilities',
  props: {
    model: Property.Dropdown({
      displayName: 'Model',
      required: true,
      description:
        'The model which will generate the completion. Some models are suitable for natural language tasks, others specialize in code.',
      refreshers: [],
      defaultValue: 'gpt-5',
      options: async ({ auth }) => {
        const promptxAuth = auth as PromptXAuthType;
        let accessToken: string;
        let openApiKey: string;

        try {
          accessToken = await getAccessToken(promptxAuth);
          openApiKey = await getAiApiKey(promptxAuth.server, accessToken);
        } catch (error) {
          console.error(error);
          return {
            disabled: true,
            placeholder: 'Unable to fetch OpenAI key. Check connection',
            options:   [],
          };
        }

        try {
          const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
              'Authorization': `Bearer ${openApiKey}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error('Failed to fetch models');
          }

          const data = await response.json();
          
          // Filter to get only LLM models
          const notLLMs = [
            'gpt-4o-realtime-preview-2024-10-01',
            'gpt-4o-realtime-preview',
            'babbage-002',
            'davinci-002',
            'tts-1-hd-1106',
            'whisper-1',
            'canary-whisper',
            'canary-tts',
            'tts-1',
            'tts-1-hd',
            'tts-1-1106',
            'dall-e-3',
            'dall-e-2',
          ];

          const models = data.data.filter(
            (model: any) => !notLLMs.includes(model.id)
          );

          return {
            disabled: false,
            options: models.map((model: any) => {
              return {
                label: model.id,
                value: model.id,
              };
            }),
          };
        } catch (error) {
          return {
            disabled: true,
            options: [],
            placeholder: "Couldn't load models, API key is invalid",
          };
        }
      },
    }),
    prompt: Property.LongText({
      displayName: 'Search Query',
      description: 'The search query or question you want to ask',
      required: true,
    }),
    website: Property.ShortText({
      displayName: 'Website',
      description: 'Website domains to search (multiple websites separated by commas, e.g., "example.com, github.com")',
      required: false,
    }),
    reasoningEffort: Property.Dropdown({
      displayName: 'Reasoning Effort',
      description: 'Level of reasoning effort for the AI response',
      required: false,
      defaultValue: 'low',
      refreshers: [],
      options: async () => {
        return {
          disabled: false,
          options: [
            { label: 'Low', value: 'low' },
            { label: 'Medium', value: 'medium' },
            { label: 'High', value: 'high' },
          ],
        };
      },
    }),
    roles: Property.Json({
      displayName: 'Roles',
      required: false,
      description: 'Array of roles to specify more accurate response and website domains to search',
      defaultValue: [
        {
          "role": "system",
          "content": "You are a helpful assistant."
        }
      ],
    }),
  },
  async run(context) {
    const { model, prompt, website, reasoningEffort, roles } = context.propsValue;
    
    await propsValidation.validateZod(context.propsValue, {
      model: z.string().min(1),
      prompt: z.string().min(1),
      website: z.string().optional(),
      reasoningEffort: z.enum(['low', 'medium', 'high']).optional(),
      roles: z.array(z.object({
        role: z.string(),
        content: z.string(),
      })).optional(),
    });

    const promptxAuth = context.auth as PromptXAuthType;
    
    try {
      const accessToken = await getAccessToken(promptxAuth);
      const openaiApiKey = await getAiApiKey(promptxAuth.server, accessToken);

      // Process roles to extract website domains and build input messages
      const rolesArray = roles ? (roles as any) : [];
      const allowedDomains: string[] = [];
      
      // Add domains from website property
      if (website) {
        const websiteDomains = website
          .split(',')
          .map((domain: string) => domain.trim())
          .filter((domain: string) => domain.length > 0);
        allowedDomains.push(...websiteDomains);
      }
      

      // Validate roles enum
      const validRoles = ['system', 'user', 'assistant'];
      rolesArray.forEach((item: any) => {
        if (!validRoles.includes(item.role)) {
          throw new Error('The only available roles are: [system, user, assistant]');
        }
      });

      // Build input messages
      const inputMessages = [
        ...rolesArray.map((role: any) => ({
          role: role.role,
          content: role.content,
        })),
        {
          role: 'user',
          content: prompt,
        },
      ];

      const requestBody = {
        input: inputMessages,
        model: model,
        tools: [
          {
            type: 'web_search',
            filters: {
              allowed_domains: allowedDomains,
            },
          },
        ],
        include: [
          'web_search_call.action.sources',
        ],
        reasoning: {
          effort: reasoningEffort || 'low',
        },
        tool_choice: 'auto',
      };

      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`API request failed with status ${response.status}: ${errorData}`);
      }

      const result = await response.json();
      
      // Extract text content from the response output
      const extractedText = result.output
        ?.find((item: any) => item.type === 'message')
        ?.content?.find((content: any) => content.type === 'output_text')
        ?.text;
      
      return {
        extractedText: extractedText || null,
        ...result,
        
      };
      
    } catch (error) {
      throw new Error(`Search website action failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});
