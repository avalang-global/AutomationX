import { createAction, Property } from '@activepieces/pieces-framework';
import { promptxAuth } from '../common/auth';
import {
  createConversation,
  fetchAgents,
  getAgentXToken,
} from '../common/helper';
import { PromptXAuthType } from '../common/types';

export const createConversationAction = createAction({
  auth: promptxAuth,
  name: 'createConversation',
  displayName: 'Create Conversation',
  description: 'Create a new conversation with an agent',
  props: {
    title: Property.ShortText({
      displayName: 'Title',
      description: 'Conversation title',
      required: true,
    }),
    slug: Property.ShortText({
      displayName: 'Slug',
      description:
        'Conversation slug / key which can be used to ensure a single conversation is used while interacting with the agent',
      required: false,
    }),
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
          }
        }
        const pxAuth: PromptXAuthType = {
          username: auth.props.username,
          password: auth.props.password,
          server: auth.props.server,
          customAuthUrl: auth.props.customAuthUrl,
          customAppUrl: auth.props.customAppUrl,
        }
        const agentXToken = await getAgentXToken(pxAuth);
        const agents = await fetchAgents({
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
    }
    const agentXToken = await getAgentXToken(pxAuth);
    const conversation = await createConversation(
      { ...pxAuth, agentXToken },
      propsValue
    );
    return conversation;
  },
});
