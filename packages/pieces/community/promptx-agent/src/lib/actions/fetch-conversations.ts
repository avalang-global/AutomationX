import { createAction, Property } from '@activepieces/pieces-framework';
import { promptxAuth } from '../common/auth';
import { fetchUrls, getAgentXToken } from '../common/helper';
import { PromptXAuthType } from '../common/types';
import {
  AuthenticationType,
  httpClient,
  HttpMethod,
} from '@activepieces/pieces-common';

export const fetchConversationsAction = createAction({
  auth: promptxAuth,
  name: 'fetchConversations',
  displayName: 'Fetch Conversations',
  description: 'Fetch list of conversations by the user',
  props: {
    slug: Property.ShortText({
      displayName: 'Slug',
      description:
        'The slug / key of the conversation to search for. Returns empty list if it does not exist',
      required: false,
    }),
  },
  async run({ auth, propsValue }) {
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

    let url = `${urls.agentXBaseUrl}/conversations`;
    if (propsValue.slug) {
      url += `?slug=${propsValue.slug}`;
    }

    const response = await httpClient.sendRequest({
      url,
      method: HttpMethod.GET,
      authentication: {
        type: AuthenticationType.BEARER_TOKEN,
        token: agentXToken,
      },
    });

    return response.body;
  },
});
