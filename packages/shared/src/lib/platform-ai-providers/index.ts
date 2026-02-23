// Custom
import { Static, Type } from '@sinclair/typebox'

export enum AiModelProviderName {
    OpenAi = 'openai',
    Anthropic = 'anthropic',
    Google = 'google',
}

export const AiModelProviderConfig = Type.Object({
    provider: Type.Enum(AiModelProviderName),
    apiKey: Type.String(),
})
export type AiModelProviderConfig = Static<typeof AiModelProviderConfig>

export const AiModelProviderSafeConfig = Type.Omit(AiModelProviderConfig, ['apiKey'])
export type AiModelProviderSafeConfig = Static<typeof AiModelProviderSafeConfig>
