
    import { createPiece, PieceAuth } from "@activepieces/pieces-framework";
    import {extractDocxAction} from "./lib/actions/extractDocx";
    import { PieceCategory } from '@activepieces/shared';
    export const docsExtraction = createPiece({
      displayName: "Text-Extraction",
      auth: PieceAuth.None(),
      minimumSupportedRelease: '0.36.1',
      logoUrl: "https://drive.google.com/uc?export=download&id=1w954BK-GTqYm7zCgZu6FdzeBmmtiKa6R",
      authors: ['tumrabert'],
      actions: [extractDocxAction],
      categories: [PieceCategory.CORE],
      triggers: [],
    });
    