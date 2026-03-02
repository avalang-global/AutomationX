import { createAction, Property } from '@activepieces/pieces-framework';
import { promptxAuth } from '../common/auth';
import { getAgentXToken, postChatMessage } from '../common/helper';
import { PromptXAuthType } from '../common/types';

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
    }
    const agentXToken = await getAgentXToken(pxAuth);
    const chatResponse = await postChatMessage(
      { ...pxAuth, agentXToken },
      conversationId,
      message
    );
    return chatResponse;
  },
});
