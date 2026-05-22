import { createAction, Property } from '@activepieces/pieces-framework';
import { promptxAuth } from '../common/auth';
import { fetchUrls, getAgentXToken } from '../common/helper';
import { PromptXAuthType } from '../common/types';
import {
  AuthenticationType,
  httpClient,
  HttpMethod,
} from '@activepieces/pieces-common';

export const talkToAgent = createAction({
  auth: promptxAuth,
  name: 'talkToAgent',
  displayName: 'Talk to Agent',
  description: 'Talk to your agent pre-configured in AgentX',
  props: {
    conversationId: Property.ShortText({
      displayName: 'Conversation',
      description: 'Conversation ID to continue your talk with the agent',
      required: true,
    }),
    message: Property.LongText({
      displayName: 'Message',
      required: true,
    }),
  },
  async run({ auth, propsValue }) {
    const { message, conversationId } = propsValue;
    const pxAuth: PromptXAuthType = {
      username: auth.props.username,
      password: auth.props.password,
      server: auth.props.server,
      customAuthUrl: auth.props.customAuthUrl,
      customAppUrl: auth.props.customAppUrl,
    };
    const { server = 'production', customAuthUrl, customAppUrl } = pxAuth;
    const agentXToken = await getAgentXToken(pxAuth);
    const urls = fetchUrls(server, customAuthUrl, customAppUrl);
    const response = await httpClient.sendRequest({
      url: `${urls.agentXBaseUrl}/chat`,
      method: HttpMethod.POST,
      authentication: {
        type: AuthenticationType.BEARER_TOKEN,
        token: agentXToken,
      },
      body: JSON.stringify({
        message,
        threadId: conversationId,
      }),
    });

    return response.body;
  },
});
