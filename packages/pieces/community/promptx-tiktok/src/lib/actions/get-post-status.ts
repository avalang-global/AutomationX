import { createAction, Property } from '@activepieces/pieces-framework';
import { httpClient, HttpMethod } from '@activepieces/pieces-common';
import { baseUrl, tiktokAuth } from '../common';

export const getPostStatus = createAction({
  name: 'get_post_status',
  displayName: 'Get Post Status',
  description: 'Check the status of a direct post using publish_id',
  props: {
    publishId: Property.ShortText({
      displayName: 'Publish ID',
      description:
        'The publish_id received from the post action (e.g. p_pub_url~v2...)',
      required: true,
    }),
  },
  auth: tiktokAuth,
  async run(context) {
    const res = await httpClient.sendRequest({
      method: HttpMethod.POST,
      url: `${baseUrl}/post/publish/status/fetch/`,
      headers: {
        Authorization: `Bearer ${context.auth.access_token}`,
        'Content-Type': 'application/json',
      },
      body: {
        publish_id: context.propsValue.publishId,
      },
    });
    return res.body;
  },
});
