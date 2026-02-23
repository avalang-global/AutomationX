import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { aiModelController } from './ai-model-controller'
import { aiProviderController } from './ai-provider-controller'

export const aiProviderModule: FastifyPluginAsyncTypebox = async (app) => {
    await app.register(aiProviderController, { prefix: '/v1/ai-providers' })
    // Custom (Handles cloud platform level AI model configuration)
    await app.register(aiModelController, { prefix: '/v1/ai-models' })
}
