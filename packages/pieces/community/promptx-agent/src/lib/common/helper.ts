import { isNil } from '@activepieces/shared';
import {
  AgentXLoginResponseType,
  PromptXAuthType,
  PromptXLoginResponseType,
  PromptXUserResponseType,
  Server,
} from './types';
import {
  AuthenticationType,
  httpClient,
  HttpMethod,
} from '@activepieces/pieces-common';

const STAGING_AUTH_URL = 'https://mocha.centerapp.io';
const PRODUCTION_AUTH_URL = 'https://centerapp.io';
const STAGING_APP_URL = 'https://test.oneweb.tech';
const PRODUCTION_APP_URL = 'https://promptxai.com';

export const fetchUrls = (
  server: Server,
  customAuthUrl?: string,
  customAppUrl?: string
) => {
  const authUrl = customAuthUrl
    ? customAuthUrl
    : server === 'staging'
    ? STAGING_AUTH_URL
    : PRODUCTION_AUTH_URL;
  const appUrl = customAppUrl
    ? customAppUrl
    : server === 'staging'
    ? STAGING_APP_URL
    : PRODUCTION_APP_URL;
  console.log(authUrl, appUrl);
  const urlMap = {
    loginUrl: `${authUrl}/center/auth/login`,
    myProfileUrl: `${authUrl}/center/api/v1/users/me`,
    agentXTokenUrl: `${appUrl}/zero-service/pmtx/sign-jwt`,
    agentXBaseUrl: `${appUrl}/agentx/v1`,
  };
  return urlMap;
};

export const getAccessToken = async (auth: PromptXAuthType) => {
  const {
    server = 'production',
    customAuthUrl,
    customAppUrl,
    username,
    password,
  } = auth;
  const urls = fetchUrls(server, customAuthUrl, customAppUrl);
  const response = await httpClient.sendRequest<PromptXLoginResponseType>({
    url: urls.loginUrl,
    method: HttpMethod.POST,
    body: JSON.stringify({ username, password }),
  });

  return response.body.access_token;
};

export const getUserProfile = async (auth: PromptXAuthType) => {
  if (isNil(auth.accessToken)) {
    throw new Error('Access token is missing to fetch user profile');
  }
  const {
    server = 'production',
    customAuthUrl,
    customAppUrl,
    accessToken,
  } = auth;
  const urls = fetchUrls(server, customAuthUrl, customAppUrl);
  const response = await httpClient.sendRequest<PromptXUserResponseType>({
    url: urls.myProfileUrl,
    method: HttpMethod.GET,
    authentication: {
      type: AuthenticationType.BEARER_TOKEN,
      token: accessToken,
    },
  });

  return response.body;
};

export const getAgentXToken = async (auth: PromptXAuthType) => {
  const { server = 'production', customAuthUrl, customAppUrl } = auth;
  const urls = fetchUrls(server, customAuthUrl, customAppUrl);
  const accessToken = await getAccessToken(auth);
  const profile = await getUserProfile({ ...auth, accessToken });
  const response = await httpClient.sendRequest<AgentXLoginResponseType>({
    url: urls.agentXTokenUrl,
    method: HttpMethod.POST,
    authentication: {
      type: AuthenticationType.BEARER_TOKEN,
      token: accessToken,
    },
    body: JSON.stringify({
      email: profile.email,
      userId: profile.userIAM2ID,
      firstName: profile.firstname,
      lastName: profile.lastname,
    }),
  });

  return response.body.token;
};

export const fetchAgents = async (auth: PromptXAuthType) => {
  if (isNil(auth.agentXToken)) {
    throw new Error('Token is missing to fetch agents');
  }
  const { server = 'production', customAuthUrl, customAppUrl } = auth;
  const urls = fetchUrls(server, customAuthUrl, customAppUrl);
  const response = await httpClient.sendRequest({
    url: `${urls.agentXBaseUrl}/agents`,
    method: HttpMethod.GET,
    authentication: {
      type: AuthenticationType.BEARER_TOKEN,
      token: auth.agentXToken,
    },
  });

  return response.body;
};
