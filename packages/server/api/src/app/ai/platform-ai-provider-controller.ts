// Custom
import { AiModelProviderConfig, AiModelProviderName, AiModelProviderSafeConfig, PrincipalType } from '@activepieces/shared'
import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { StatusCodes } from 'http-status-codes'
import { platformAiProviderService } from './platform-ai-provider-service'

export const platformAiProviderController: FastifyPluginAsyncTypebox = async (app) => {
    app.get('/', ListPlatformAiProvidersRequest, async () => {
        return platformAiProviderService(app.log).list()
    })
    app.get('/:provider', GetPlatformAiProviderRequest, async (request) => {
        return platformAiProviderService(app.log).getOrThrow({ provider: request.params.provider })
    })
}

const ListPlatformAiProvidersRequest = {
    config: {
        allowedPrincipals: [PrincipalType.USER, PrincipalType.ENGINE] as const,
    },
    schema: {
        response: {
            [StatusCodes.OK]: Type.Array(AiModelProviderSafeConfig),
        },
    },
}

const GetPlatformAiProviderRequest = {
    config: {
        allowedPrincipals: [PrincipalType.ENGINE] as const,
    },
    schema: {
        params: Type.Object({
            provider: Type.Enum(AiModelProviderName),
        }),
        response: {
            [StatusCodes.OK]: AiModelProviderConfig,
        },
    },
}
