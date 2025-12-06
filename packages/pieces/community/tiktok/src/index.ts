import { createPiece } from '@activepieces/pieces-framework';
import { createCustomApiCallAction } from '@activepieces/pieces-common';
import { postPhotos } from './lib/actions/post-photos';
import { tiktokAuth } from './lib/common/common';

export const tiktok = createPiece({
  displayName: 'Tiktok',
  auth: tiktokAuth,
  minimumSupportedRelease: '0.36.1',
  logoUrl: 'https://cdn.activepieces.com/pieces/tiktok.png',
  authors: [`worachot.c`],
  actions: [
    postPhotos,
    createCustomApiCallAction({
        baseUrl: () => 'https://tidycal.com/api',
        auth: tiktokAuth,
        authMapping: async (auth) => ({
          Authorization: `Bearer ${auth}`,
        }),
      }),
  ],
  triggers: [],
});