import { createPiece } from '@activepieces/pieces-framework';
import { PieceCategory } from '@activepieces/shared';
import { chatGemini } from './lib/actions/chat-gemini';
import { generateContentFromImageAction } from './lib/actions/generate-content-from-image';
import { generateContentAction } from './lib/actions/generate-content';
import { promptxAuth } from './lib/common/common';

export const promptxGoogleGemini = createPiece({
  displayName: 'PromptX Google Gemini',
  auth: promptxAuth,
  description:
    'Talk to Google Gemini using your available PromptX credits. Use the many tools Gemini has to offer using your PromptX credits per request',
  minimumSupportedRelease: '0.63.0',
  logoUrl: 'https://cdn.activepieces.com/pieces/google-gemini.png',
  categories: [PieceCategory.ARTIFICIAL_INTELLIGENCE],
  authors: ['tumrabert', 'rupalbarman'],
  actions: [generateContentAction, generateContentFromImageAction, chatGemini],
  triggers: [],
});
