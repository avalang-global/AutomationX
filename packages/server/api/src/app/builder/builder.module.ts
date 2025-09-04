import { PrincipalType } from '@activepieces/shared'
import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { StatusCodes } from 'http-status-codes'
import { builderService } from './builder.service'


export const builderModule: FastifyPluginAsyncTypebox = async (app) => {
    await app.register(builderController, { prefix: '/v1/builder' })
}

const builderController: FastifyPluginAsyncTypebox = async (app) => {
    app.post('/flow/:id', UpdateBuilderFlowRequestParams, async (request) => {
        const platformId = request.principal.platform.id
        const projectId = request.principal.projectId
        const userId = request.principal.id
        const { messages } = request.body
        request.log.info({ messages }, 'messages')
        const result = await builderService(request.log).runAndUpdate({
            userId,
            projectId,
            platformId,
            flowId: request.params.id,
            messages,
        })
        return result.text
    })
}

const UpdateBuilderFlowRequest = Type.Object({
    messages: Type.Array(Type.Object({
        role: Type.Union([Type.Literal('assistant'), Type.Literal('user')]),
        content: Type.String(),
    })),
})

const UpdateBuilderFlowRequestParams = {
    schema: {
        body: UpdateBuilderFlowRequest,
        params: Type.Object({
            id: Type.String(),
        }),
        response: {
            [StatusCodes.CREATED]: Type.Any(),
        },
    },
    config: {
        allowedPrincipals: [PrincipalType.USER],
    },
}
