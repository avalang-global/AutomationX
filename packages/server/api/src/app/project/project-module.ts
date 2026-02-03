import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { platformProjectController } from './platform/platform-project.controller'
import { userPlatformProjectController } from './platform/user-project.controller'
import { projectWorkerController } from './project-worker-controller'

export const projectModule: FastifyPluginAsyncTypebox = async (app) => {
    // await app.register(projectController, { prefix: '/v1/projects' })
    await app.register(projectWorkerController, { prefix: '/v1/worker/project' })

    // Custom implementations
    await app.register(platformProjectController, { prefix: '/v1/projects' })
    await app.register(userPlatformProjectController, { prefix: '/v1/users/projects' })
}
