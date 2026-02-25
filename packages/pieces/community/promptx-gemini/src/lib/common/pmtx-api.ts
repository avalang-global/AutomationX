import { httpClient, HttpMethod } from '@activepieces/pieces-common';
import { Store } from '@activepieces/pieces-framework';
import { AiModelProviderConfig } from '@activepieces/shared';

export type PromptXAuthType = {
  server: 'production' | 'staging';
  username: string;
  password: string;
};

export type AccessTokenResponse = {
  access_token?: string;
  error?: string;
  message?: string;
};

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

export const getAccessToken = async ({
  server,
  username,
  password,
}: PromptXAuthType) => {
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
  server: 'production' | 'staging',
  access_token: string
) => {
  const response = await fetch(baseUrlMap[server]['addTokenUrl'], {
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

export const getUsagePlan = async (
  server: 'production' | 'staging',
  access_token: string
) => {
  const response = await fetch(baseUrlMap[server]['quotaCheckUrl'], {
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

export const getUserProfile = async (
  server: 'production' | 'staging',
  access_token: string
) => {
  const response = await fetch(baseUrlMap[server]['myProfileUrl'], {
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
  server: 'production' | 'staging',
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
    url: `${apiUrl}v1/platform-ai-providers/google`,
    headers: {
      Authorization: `Bearer ${engineToken}`,
    },
  });

  if (response.status !== 200) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.body.apiKey;
};
