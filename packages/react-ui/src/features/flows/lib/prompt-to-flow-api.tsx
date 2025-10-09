// Custom
import { api } from '@/lib/api';
import { BuilderMessage, BuilderMessageRoleSchema } from '@activepieces/shared';
import { Static, Type } from '@sinclair/typebox';

const PromptMessage = Type.Object({
  role: BuilderMessageRoleSchema,
  content: Type.String(),
  created: Type.Optional(Type.String()), // ISO string
});

export type PromptMessage = Static<typeof PromptMessage>;

export const promptFlowApi = {
  chat(flowId: string, messages: PromptMessage[]): Promise<string> {
    return api.post<string>(`/v1/builder/flow/${flowId}`, {
      messages,
    });
  },
  get(flowId: string): Promise<BuilderMessage[]> {
    return api.get<BuilderMessage[]>(`/v1/builder/flow/${flowId}`);
  },
};
