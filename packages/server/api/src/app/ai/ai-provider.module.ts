import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { aiProviderController } from './ai-provider-controller'
import { platformAiProviderController } from './platform-ai-provider-controller'

export const aiProviderModule: FastifyPluginAsyncTypebox = async (app) => {
    await app.register(aiProviderController, { prefix: '/v1/ai-providers' })
    // Custom
    await app.register(platformAiProviderController, { prefix: '/v1/platform-ai-providers' })
}
