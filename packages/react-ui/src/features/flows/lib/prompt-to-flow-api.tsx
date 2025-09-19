// Custom
import { api } from '@/lib/api';
import { Static, Type } from '@sinclair/typebox';

export enum PromptMessageRoleEnum {
  user = 'user',
  assistant = 'assistant',
}

const PromptMessageRole = Type.Enum(PromptMessageRoleEnum);

type PromptMessageRole = Static<typeof PromptMessageRole>;

const PromptMessage = Type.Object({
  role: PromptMessageRole,
  content: Type.String(),
  createdAt: Type.Optional(Type.String()), // ISO string
});

export type PromptMessage = Static<typeof PromptMessage>;

export const promptFlowApi = {
  chat(flowId: string, messages: PromptMessage[]): Promise<string> {
    return api.post<string>(`/v1/builder/flow/${flowId}`, {
      messages,
    });
  },
};
