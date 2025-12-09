import { PieceAuth } from '@activepieces/pieces-framework';

export const tiktokAuth = PieceAuth.SecretText({
  displayName: 'API Key',
  required: true,
  description: 'The API key for accessing Tiktok',
});

export const baseUrl = 'https://open.tiktokapis.com/v2';
