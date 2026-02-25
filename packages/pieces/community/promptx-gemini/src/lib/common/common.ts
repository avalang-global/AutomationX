import { PieceAuth, Property } from '@activepieces/pieces-framework';
import { baseUrlMap } from './pmtx-api';

export const promptxAuth = PieceAuth.CustomAuth({
  required: true,
  props: {
    server: Property.StaticDropdown({
      displayName: 'Server',
      options: {
        options: [
          {
            label: 'Production',
            value: 'production',
          },
          {
            label: 'Test',
            value: 'staging',
          },
        ],
      },
      required: true,
      defaultValue: 'production',
    }),
    username: Property.ShortText({
      displayName: 'Username',
      description: 'PromptX username',
      required: true,
    }),
    password: PieceAuth.SecretText({
      displayName: 'Password',
      description: 'PromptX password',
      required: true,
    }),
  },
  validate: async ({ auth }) => {
    const { username, password } = auth;
    if (!username || !password) {
      return {
        valid: false,
        error: 'Empty Username or Password',
      };
    }

    const loginUrl = baseUrlMap[auth.server].loginUrl;
    const isStaging = auth.server === 'staging';
    const body = isStaging
      ? new URLSearchParams({ username, password }).toString()
      : JSON.stringify({ username, password });
    const headers = {
      'Content-Type': isStaging
        ? 'application/x-www-form-urlencoded'
        : 'application/json',
    };

    const response = await fetch(loginUrl, {
      method: 'POST',
      body,
      headers,
    });

    if (!response.ok) {
      const data = await response.json();
      return {
        valid: false,
        error: data?.error || data?.message,
      };
    }

    return {
      valid: true,
    };
  },
});

export const billingIssueMessage = `Error Occurred: 429 \n

1. Ensure that you have enough tokens on your Anthropic platform. \n
2. Top-up the credit in promptX's Billing page. \n
3. Attempt the process again`;

export const defaultLLM = 'models/gemini-2.5-flash-lite';

export const getGeminiModelOptions = () => {
  return [
    { label: 'gemini-3-pro', value: 'models/gemini-3-pro' },
    { label: 'gemini-3-flash', value: 'models/gemini-3-flash' },
    { label: 'gemini-2.5-pro', value: 'modes/gemini-2.5-pro' },
    { label: 'gemini-2.5-flash', value: 'models/gemini-2.5-flash' },
    { label: 'gemini-2.5-flash-lite', value: 'models/gemini-2.5-flash-lite' },
    { label: 'gemini-2.0-flash', value: 'models/gemini-2.0-flash' },
    { label: 'gemini-2.0-flash-lite', value: 'models/gemini-2.0-flash-lite'},
  ]
};
