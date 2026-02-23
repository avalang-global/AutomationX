// Custom
import { AiModelProviderConfig, AiModelProviderName, AiModelProviderSafeConfig, PrincipalType } from '@activepieces/shared'
import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { StatusCodes } from 'http-status-codes'
import { aiModelService } from './ai-model-service'

export const aiModelController: FastifyPluginAsyncTypebox = async (app) => {
    app.get('/', ListAIModelsRequest, async () => {
        return aiModelService(app.log).listModels()
    })
    app.get('/:provider', GetAIModelRequest, async (request) => {
        return aiModelService(app.log).getModel({ provider: request.params.provider })
    })
}

const ListAIModelsRequest = {
    config: {
        allowedPrincipals: [PrincipalType.USER, PrincipalType.ENGINE] as const,
    },
    schema: {
        response: {
            [StatusCodes.OK]: Type.Array(AiModelProviderSafeConfig),
        },
    },
}

const GetAIModelRequest = {
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
