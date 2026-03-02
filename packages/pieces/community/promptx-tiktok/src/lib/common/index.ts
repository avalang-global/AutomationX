import { PieceAuth } from '@activepieces/pieces-framework';

export const tiktokAuth = PieceAuth.OAuth2({
  description: `
  1. Go to [developers.tiktok.com](https://developers.tiktok.com/) and log in to your account.
  2. Click **Create App** and select **App for Business**.
  3. Fill in your app details and select the appropriate category.
  4. Copy the Client Key and Client Secret from the app settings.
  5. Add your redirect URL in the app configuration.
  6. Go to **Scopes** and add the required scopes like **user.info.basic**, **video.list**, and **video.publish**.`,
  authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
  tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
  required: true,
  scope: [
    'video.publish,video.upload,user.info.basic,user.info.profile,video.list',
  ],
  pkce: true,
  pkceMethod: 'S256',
});

export const baseUrl = 'https://open.tiktokapis.com/v2';
