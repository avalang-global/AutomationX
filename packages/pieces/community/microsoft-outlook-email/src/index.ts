import {
  createPiece,
  OAuth2PropertyValue,
} from '@activepieces/pieces-framework';
import { createCustomApiCallAction } from '@activepieces/pieces-common';
import { newEmailTrigger } from './lib/triggers/new-email';
import { sendEmail } from './lib/actions/send-email';
import { replyEmail } from './lib/actions/reply-email';
import { downloadAttachment } from './lib/actions/download-attachment';
import { microsoftOutlookEmailAuth } from './lib/auth';

export const microsoftOutlookEmail = createPiece({
  displayName: 'Microsoft Outlook Email',
  description: 'Email service by Microsoft Outlook',
  auth: microsoftOutlookEmailAuth,
  minimumSupportedRelease: '0.36.1',
  logoUrl: 'https://cdn.activepieces.com/pieces/microsoft-outlook.png',
  authors: [],
  actions: [
    sendEmail,
    replyEmail,
    downloadAttachment,
    createCustomApiCallAction({
      baseUrl: () => 'https://graph.microsoft.com/v1.0/',
      auth: microsoftOutlookEmailAuth,
      authMapping: async (auth) => ({
        Authorization: `Bearer ${(auth as OAuth2PropertyValue).access_token}`,
      }),
    }),
  ],
  triggers: [newEmailTrigger],
});
