import { createAction, Property } from '@activepieces/pieces-framework';
import {planeAuth,baseUrl} from '../../index';
import { httpClient, HttpMethod } from '@activepieces/pieces-common';

export const listAllItemsInModule = createAction({
  // auth: check https://www.activepieces.com/docs/developers/piece-reference/authentication,
  name: 'list-all-items-in-module',
  displayName: 'List all work items in a module',
  description: 'Returns a list of all work items in a module.',
  props: {
    workspace_slug:Property.ShortText({
      displayName: 'workspace_slug',
      description: 'The workspace_slug represents the unique workspace identifier for a workspace in Plane. It can be found in the URL. For example, in the URL https://app.plane.so/my-team/projects/, the workspace slug is my-team.',
      required: true
    }),
    project_id:Property.ShortText({
      displayName: 'project_id',
      description: 'The unique identifier of the project.',
      required: true
    }),
    module_id:Property.ShortText({
      displayName: 'module_id',
      description: 'The unique identifier for the module.',
      required: true
    }),
  },
  auth: planeAuth,
  async run(context) {
    const { workspace_slug, project_id,module_id} = context.propsValue;
    const res = await httpClient.sendRequest<string[]>({
      method: HttpMethod.GET,
      url: `${baseUrl}/api/v1/workspaces/${workspace_slug}/projects/${project_id}/modules/${module_id}/module-issues/`,
      headers: {
              'X-API-Key': context.auth, 
            },
    });
    return res.body;
  },
});
