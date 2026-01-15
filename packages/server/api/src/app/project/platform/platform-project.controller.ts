/*
This is a custom implementation to support platform projects with access control and other features.
The logic has been isolated to this file to avoid potential conflicts with the open-source modules from upstream
*/
import { ProjectResourceType, securityAccess } from '@activepieces/server-shared'
import {
    ActivepiecesError,
    CreatePlatformProjectRequest,
    ErrorCode,
    ListProjectRequestForPlatformQueryParams,
    Permission,
    PlatformRole,
    Principal,
    PrincipalType,
    ProjectType,
    ProjectWithLimits,
    SeekPage,
    SERVICE_KEY_SECURITY_OPENAPI,
    ServicePrincipal,
    UpdateProjectPlatformRequest,
    UserPrincipal,
} from '@activepieces/shared'
import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { StatusCodes } from 'http-status-codes'
import { platformService } from '../../platform/platform.service'
import { userService } from '../../user/user-service'
import { projectService } from '../project-service'
import { enrichProjects, platformProjectService } from './platform-project.service'


export const platformProjectController: FastifyPluginAsyncTypebox = async (app) => {


    app.get('/:id', GetProjectRequest, async (request) => {
        return platformProjectService(request.log).getWithPlanAndUsageOrThrow(request.projectId)
    })


    app.post('/', CreateProjectRequest, async (request, reply) => {
        const platformId = request.principal.platform.id
        const platform = await platformService.getOneOrThrow(platformId)
        const project = await projectService.create({
            platformId,
            ownerId: platform.ownerId,
            displayName: request.body.displayName,
            externalId: request.body.externalId ?? undefined,
            metadata: request.body.metadata ?? undefined,
            type: ProjectType.TEAM,
        })
        const projectWithUsage = await enrichProjects([ project ], app.log)
        await reply.status(StatusCodes.CREATED).send(projectWithUsage[0])
    })

    app.get('/', ListProjectRequestForPlatform, async (request, _reply) => {
        const userId = await getUserId(request.principal)
        const user = await userService.getOneOrFail({ id: userId })
        return platformProjectService(request.log).getForPlatform({
            platformId: request.principal.platform.id,
            externalId: request.query.externalId,
            cursorRequest: request.query.cursor ?? null,
            displayName: request.query.displayName,
            types: request.query.types,
            limit: request.query.limit ?? 50,
            userId,
            isPrivileged: userService.isUserPrivileged(user),
        })
    })

    app.post('/:id', UpdateProjectRequest, async (request) => {
        const project = await projectService.getOneOrThrow(request.params.id)
        const haveTokenForTheProject = request.projectId === project.id
        const ownThePlatform = await isPlatformAdmin(request.principal as ServicePrincipal | UserPrincipal, project.platformId)
        if (!haveTokenForTheProject && !ownThePlatform) {
            throw new ActivepiecesError({
                code: ErrorCode.AUTHORIZATION,
                params: {},
            })
        }
        return platformProjectService(request.log).update({
            platformId: request.principal.platform.id,
            projectId: request.params.id,
            request: {
                ...request.body,
                externalId: ownThePlatform ? request.body.externalId : undefined,
            },
        })
    })

    app.delete('/:id', DeleteProjectRequest, async (req, res) => {
        await assertProjectToDeleteIsNotPersonalProject(req.params.id)
        await platformProjectService(req.log).hardDelete({
            id: req.params.id,
            platformId: req.principal.platform.id,
        })

        return res.status(StatusCodes.NO_CONTENT).send()
    })
}

async function getUserId(principal: Principal): Promise<string> {
    if (principal.type === PrincipalType.SERVICE) {
        const platform = await platformService.getOneOrThrow(principal.platform.id)
        return platform.ownerId
    }
    return principal.id
}

async function isPlatformAdmin(principal: ServicePrincipal | UserPrincipal, platformId: string): Promise<boolean> {
    if (principal.platform.id !== platformId) {
        return false
    }
    if (principal.type === PrincipalType.SERVICE) {
        return true
    }
    const user = await userService.getOneOrFail({
        id: principal.id,
    })
    return user.platformRole === PlatformRole.ADMIN
}


async function assertProjectToDeleteIsNotPersonalProject(projectId: string): Promise<void> {
    const project = await projectService.getOneOrThrow(projectId)
    if (project.type === ProjectType.PERSONAL) {
        throw new ActivepiecesError({
            code: ErrorCode.VALIDATION,
            params: {
                message: 'Personal projects cannot be deleted',
            },
        })
    }
}

const GetProjectRequest = {
    config: {
        security: securityAccess.project(
            [PrincipalType.USER, PrincipalType.SERVICE],
            undefined, {
                type: ProjectResourceType.PARAM,
                paramKey: 'id',
            }),
    },
}

const UpdateProjectRequest = {
    config: {
        security: securityAccess.project([PrincipalType.USER, PrincipalType.SERVICE], Permission.WRITE_PROJECT, {
            type: ProjectResourceType.PARAM,
            paramKey: 'id',
        }),
    },
    schema: {
        tags: ['projects'],
        security: [SERVICE_KEY_SECURITY_OPENAPI],
        params: Type.Object({
            id: Type.String(),
        }),
        response: {
            [StatusCodes.OK]: ProjectWithLimits,
        },
        body: UpdateProjectPlatformRequest,
    },
}

const CreateProjectRequest = {
    config: {
        security: securityAccess.publicPlatform([PrincipalType.USER, PrincipalType.SERVICE]),
    },
    schema: {
        tags: ['projects'],
        response: {
            [StatusCodes.CREATED]: ProjectWithLimits,
        },
        security: [SERVICE_KEY_SECURITY_OPENAPI],
        body: CreatePlatformProjectRequest,
    },
}

const ListProjectRequestForPlatform = {
    config: {
        security: securityAccess.publicPlatform([PrincipalType.USER, PrincipalType.SERVICE]),
    },
    schema: {
        response: {
            [StatusCodes.OK]: SeekPage(ProjectWithLimits),
        },
        querystring: ListProjectRequestForPlatformQueryParams,
        tags: ['projects'],
        security: [SERVICE_KEY_SECURITY_OPENAPI],
    },
}

const DeleteProjectRequest = {
    config: {
        security: securityAccess.platformAdminOnly([PrincipalType.USER, PrincipalType.SERVICE]),
    },
    schema: {
        params: Type.Object({
            id: Type.String(),
        }),
        tags: ['projects'],
        security: [SERVICE_KEY_SECURITY_OPENAPI],
    },
}
