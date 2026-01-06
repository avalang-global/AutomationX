import { ProjectResourceType, securityAccess } from '@activepieces/server-shared'
import { ListProjectMemberQueryParams, Permission, PrincipalType, ProjectMember, SeekPage } from '@activepieces/shared'
import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { StatusCodes } from 'http-status-codes'
import { entitiesMustBeOwnedByCurrentProject } from '../authentication/authorization'
import { ProjectMemberEntity } from './project-member.entity'
import { projectMemberService } from './project-member.service'

export const projectMemberModule: FastifyPluginAsyncTypebox = async (app) => {
    app.addHook('preSerialization', entitiesMustBeOwnedByCurrentProject)
    await app.register(projectMemberController, { prefix: '/v1/project-members' })
}

const projectMemberController: FastifyPluginAsyncTypebox = async (app) => {
    app.get('/', ListProjectMemberRequest, async (request) => {
        return projectMemberService.list({
            platformId: request.principal.platform.id,
            projectId: request.projectId,
            cursorRequest: request.query.cursor ?? null,
            limit: request.query.limit ?? 50,
        })
    })

    app.delete('/:id', DeleteProjectMemberRequest, async (request, reply) => {
        await projectMemberService.delete({
            projectId: request.projectId,
            projectMemberId: request.params.id,
        })
        await reply.status(StatusCodes.NO_CONTENT).send()
    })
}

const ListProjectMemberRequest = {
    config: {
        security: securityAccess.project(
            [PrincipalType.USER, PrincipalType.SERVICE],
            Permission.READ_PROJECT_MEMBER,
            {
                type: ProjectResourceType.QUERY,
            },
        ),
    },
    schema: {
        tags: ['project-member'],
        querystring: ListProjectMemberQueryParams,
        response: {
            [StatusCodes.OK]: SeekPage(ProjectMember),
        },
    },
}

const DeleteProjectMemberRequest = {
    config: {
        security: securityAccess.project(
            [PrincipalType.USER, PrincipalType.SERVICE],
            Permission.WRITE_PROJECT_MEMBER,
            {
                type: ProjectResourceType.TABLE,
                tableName: ProjectMemberEntity,
            },
        ),
    },
    schema: {
        tags: ['project-member'],
        response: {
            [StatusCodes.NO_CONTENT]: Type.Never(),
        },
        params: Type.Object({
            id: Type.String(),
        }),
    },
}
