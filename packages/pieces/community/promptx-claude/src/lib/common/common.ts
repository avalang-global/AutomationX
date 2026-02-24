import { httpClient, HttpMethod } from '@activepieces/pieces-common';
import { Store } from '@activepieces/pieces-framework';
import { AiModelProviderConfig } from '@activepieces/shared';

export const baseUrl = 'https://api.anthropic.com/v1';

export const billingIssueMessage = `Error Occurred: 429 \n

1. Ensure that you have enough tokens on your Anthropic platform. \n
2. Top-up the credit in promptX's Billing page. \n
3. Attempt the process again`;

type UrlConfig = {
  loginUrl: string;
  quotaCheckUrl: string;
  addTokenUrl: string;
  myProfileUrl: string;
};

type UsagePackage = {
  package_name: string;
  total_tokens_used: number;
  limit_token_usage: number;
  token_available: number;
  total_credit_used: number;
  limit_credit_usage: number;
  credit_available: number;
};

type UserInfo = {
  userIAM2ID: string;
  email: string;
  username: string;
};

interface Usage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

interface AppUsageData {
  appId?: string;
  userId: string;
  model: string;
  projectId: string;
  flowId: string;
  agentId?: string;
  component: string;
  usage: Usage;
}

type AccessTokenResponse = {
  access_token?: string;
  error?: string;
  message?: string;
};

export const baseUrlMap: Record<string, UrlConfig> = {
  production: {
    loginUrl: 'https://centerapp.io/center/auth/login',
    quotaCheckUrl:
      'https://promptxai.com/zero-service/pmtx-ai-token-api/v1/quota-check',
    addTokenUrl:
      'https://promptxai.com/zero-service/pmtx-ai-token-api/v1/token-used',
    myProfileUrl: 'https://centerapp.io/center//api/v1/users/me',
  },
  staging: {
    loginUrl: 'https://test.oneweb.tech/zero-service/pmtx/login',
    quotaCheckUrl:
      'https://test.oneweb.tech/zero-service/pmtx-ai-token-api/v1/quota-check',
    addTokenUrl:
      'https://test.oneweb.tech/zero-service/pmtx-ai-token-api/v1/token-used',
    myProfileUrl: 'https://mocha.centerapp.io/center//api/v1/users/me',
  },
};

export const getAccessToken = async (
  server: string,
  username: string,
  password: string
): Promise<string | null> => {
  const isStaging = server === 'staging';
  const body = isStaging
    ? new URLSearchParams({ username, password }).toString()
    : JSON.stringify({ username, password });

  const headers = {
    'Content-Type': isStaging
      ? 'application/x-www-form-urlencoded'
      : 'application/json',
  };

  const response = await fetch(baseUrlMap[server].loginUrl, {
    method: 'POST',
    body,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const data: AccessTokenResponse = await response.json();
  if (!data.access_token) {
    throw new Error(data?.error || data?.message);
  }

  return data.access_token;
};

export const addTokenUsage = async (
  data: AppUsageData,
  server: string,
  access_token: string
) => {
  const response = await fetch(baseUrlMap[server].addTokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${access_token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  return result;
};

export const getUsagePlan = async (server: string, access_token: string) => {
  const response = await fetch(baseUrlMap[server].quotaCheckUrl, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${access_token}`,
    },
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  const result: UsagePackage = await response.json();
  return result;
};

export const getUserProfile = async (server: string, access_token: string) => {
  const response = await fetch(baseUrlMap[server].myProfileUrl, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${access_token}`,
    },
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  const result: UserInfo = await response.json();
  return result;
};

export const getStoreData = async (
  store: Store,
  server: string,
  access_token: string
) => {
  let userId = await store.get('userId');

  if (!userId) {
    const userInfo = await getUserProfile(server, access_token);
    store.put('userId', userInfo.userIAM2ID);
    userId = userInfo.userIAM2ID;
  }

  return { userId };
};

export const getAiApiKey = async (apiUrl: string, engineToken: string) => {
  const response = await httpClient.sendRequest<AiModelProviderConfig>({
    method: HttpMethod.GET,
    url: `${apiUrl}v1/platform-ai-providers/anthropic`,
    headers: {
      Authorization: `Bearer ${engineToken}`,
    },
  });

  if (response.status !== 200) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.body.apiKey;
};

export const getAnthropicModelOptions = () => {
  return [
    { value: 'claude-opus-4-1-20250805', label: 'Claude 4.1 Opus' },
    { value: 'claude-sonnet-4-20250514', label: 'Claude 4 Sonnet' },
    { value: 'claude-3-7-sonnet-20250219', label: 'Claude 3.7 Sonnet' },
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
  ];
};
