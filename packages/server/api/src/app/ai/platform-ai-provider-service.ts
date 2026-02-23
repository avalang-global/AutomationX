// Custom
import { AppSystemProp } from '@activepieces/server-shared'
import { ActivepiecesError, AiModelProviderConfig, AiModelProviderName, AiModelProviderSafeConfig, ErrorCode, isNil } from '@activepieces/shared'
import { FastifyBaseLogger } from 'fastify'
import { system } from '../helper/system/system'

export const platformAiProviderService = (log: FastifyBaseLogger) => ({
    listModels(): AiModelProviderSafeConfig[] {
        const availableAiModels: AiModelProviderSafeConfig[] = []

        if (!isNil(system.get(AppSystemProp.PROMPTX_OPENAI_KEY))) {
            availableAiModels.push({ provider: AiModelProviderName.OpenAi })
        }

        if (!isNil(system.get(AppSystemProp.PROMPTX_ANTHROPIC_KEY))) {
            availableAiModels.push({ provider: AiModelProviderName.Anthropic })
        }

        if (!isNil(system.get(AppSystemProp.PROMPTX_GOOGLE_KEY))) {
            availableAiModels.push({ provider: AiModelProviderName.Google })
        }

        return availableAiModels
    },

    getModel({ provider }: GetModelParams): AiModelProviderConfig {
        let apiKey: string | undefined
        switch (provider) {
            case AiModelProviderName.OpenAi: apiKey = system.get(AppSystemProp.PROMPTX_OPENAI_KEY); break
            case AiModelProviderName.Anthropic: apiKey = system.get(AppSystemProp.PROMPTX_ANTHROPIC_KEY); break
            case AiModelProviderName.Google: apiKey = system.get(AppSystemProp.PROMPTX_GOOGLE_KEY); break
        }
        if (isNil(apiKey)) {
            log.error({ provider }, 'AI model provider not found')
            throw new ActivepiecesError({
                code: ErrorCode.AI_PROVIDER_NOT_SUPPORTED,
                params: { provider },
            })
        }
        return { provider, apiKey }
    },
})

type GetModelParams = {
    provider: AiModelProviderName
}
