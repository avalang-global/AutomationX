import { createAction, Property } from '@activepieces/pieces-framework';
import { promptxAuth } from '../common/auth';
import { Agent, PromptXAuthType } from '../common/types';
import { fetchAgents, fetchUrls, getAgentXToken } from '../common/helper';
import {
  AuthenticationType,
  httpClient,
  HttpMethod,
} from '@activepieces/pieces-common';

export const fetchAgentDetails = createAction({
  auth: promptxAuth,
  name: 'fetchAgentDetails',
  displayName: 'Fetch Agent Details',
  description: 'Fetch information of an agent - their role, persona and tools',
  props: {
    agentId: Property.Dropdown({
      auth: promptxAuth,
      displayName: 'Agent',
      description: 'Agent that you would like to converse with',
      required: true,
      refreshers: ['auth'],
      options: async ({ auth }) => {
        if (!auth) {
          return {
            disabled: true,
            options: [],
          };
        }
        const pxAuth: PromptXAuthType = {
          username: auth.props.username,
          password: auth.props.password,
          server: auth.props.server,
          customAuthUrl: auth.props.customAuthUrl,
          customAppUrl: auth.props.customAppUrl,
        };
        const agentXToken = await getAgentXToken(pxAuth);
        const agents: Agent[] = await fetchAgents({
          ...pxAuth,
          agentXToken,
        });
        return {
          disabled: false,
          options: agents.map((agent) => {
            return {
              label: agent.name,
              value: agent.id,
            };
          }),
        };
      },
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
    const response = await httpClient.sendRequest({
      url: `${urls.agentXBaseUrl}/agents/${propsValue.agentId}`,
      method: HttpMethod.GET,
      authentication: {
        type: AuthenticationType.BEARER_TOKEN,
        token: agentXToken,
      },
    });

    return response.body;
  },
});
