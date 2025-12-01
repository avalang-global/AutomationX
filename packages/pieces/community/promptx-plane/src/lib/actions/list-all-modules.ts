import { createAction, Property } from '@activepieces/pieces-framework';
import {planeAuth,baseUrl} from '../../index';
import { httpClient, HttpMethod } from '@activepieces/pieces-common';
export const listAllModules = createAction({
  name: 'list-all-modules',
  displayName: 'List all modules',
  description: 'Returns a list of all modules in a project.',
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
  },
  auth: planeAuth,
  async run(context) {
    const { workspace_slug, project_id} = context.propsValue;
    
    const res = await httpClient.sendRequest<any>({
      method: HttpMethod.GET,
      url: `${baseUrl}/api/v1/workspaces/${workspace_slug}/projects/${project_id}/modules/`,
      headers: {
        'X-API-Key': context.auth,
      },
    });
    
    return res.body;
  },
});
