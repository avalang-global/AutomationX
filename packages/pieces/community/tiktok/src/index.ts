import { createCustomApiCallAction } from '@activepieces/pieces-common';
import { createPiece } from '@activepieces/pieces-framework';
import { postPhotos } from './lib/actions/post-photos';
import { tiktokAuth } from './lib/common';

export const tiktok = createPiece({
  auth: tiktokAuth,
  displayName: 'Tiktok',
  description: 'Interact with TikTok social platform',
  minimumSupportedRelease: '0.36.1',
  logoUrl: 'https://s.magecdn.com/social/tc-tiktok.svg',
  authors: ['worachot.c'],
  actions: [
    postPhotos,
    createCustomApiCallAction({
        baseUrl: () => 'https://open.tiktokapis.com/v2',
        auth: tiktokAuth,
        authMapping: async (auth) => ({
          Authorization: `Bearer ${auth}`,
        }),
      }),
  ],
  triggers: [],
});
