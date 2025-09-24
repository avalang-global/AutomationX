import { OAuth2PropertyValue, PieceAuth } from "@activepieces/pieces-framework";
import { Client } from "@microsoft/microsoft-graph-client";

export const microsoftOutlookEmailAuth = PieceAuth.OAuth2({
	description: 'Authentication for Microsoft Outlook Email',
	authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
	tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
	required: true,
	scope: ['Mail.ReadWrite', 'Mail.Send', 'offline_access', 'User.Read'],
	prompt: 'omit',
	validate: async ({ auth }) => {
		try {
			const authValue = auth as OAuth2PropertyValue;
			const client = Client.initWithMiddleware({
				authProvider: {
					getAccessToken: () => Promise.resolve(authValue.access_token),
				},
			});
			await client.api('/me').get();
			console.warn('[ms-outlook-email] successful authentication');
			return { valid: true };
		} catch (error) {
		    console.warn('[ms-outlook-email] failed authentication');
			return { valid: false, error: 'Invalid Outlook credentials.' };
		}
	},
});
