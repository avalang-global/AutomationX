import { createCustomApiCallAction } from '@activepieces/pieces-common';
import { createPiece } from '@activepieces/pieces-framework';
import { postPhotos } from './lib/actions/post-photo';
import { getPostStatus } from './lib/actions/get-post-status';
import { baseUrl, tiktokAuth } from './lib/common';

export const tiktok = createPiece({
  auth: tiktokAuth,
  displayName: 'Tiktok',
  description: 'Interact with TikTok social platform',
  minimumSupportedRelease: '0.74.3',
  logoUrl: 'https://s.magecdn.com/social/tc-tiktok.svg',
  authors: ['worachot.c'],
  actions: [
    postPhotos,
    getPostStatus,
    createCustomApiCallAction({
      baseUrl: () => baseUrl,
      auth: tiktokAuth,
      authMapping: async (auth) => ({
        Authorization: `Bearer ${auth.access_token}`,
      }),
    }),
  ],
  triggers: [],
});
