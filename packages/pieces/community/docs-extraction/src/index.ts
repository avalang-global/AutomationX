
    import { createPiece, PieceAuth } from "@activepieces/pieces-framework";
    import {extractDocxAction} from "./lib/actions/extractDocx";
    import { PieceCategory } from '@activepieces/shared';
    export const docsExtraction = createPiece({
      displayName: "Text Extraction",
      auth: PieceAuth.None(),
      minimumSupportedRelease: '0.36.1',
      logoUrl: "https://cdn.activepieces.com/pieces/text-helper.svg",
      authors: ['tumrabert'],
      actions: [extractDocxAction],
      categories: [PieceCategory.PRODUCTIVITY],
      triggers: [],
    });
    