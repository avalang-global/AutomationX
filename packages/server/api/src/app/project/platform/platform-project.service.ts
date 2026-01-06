/*
This is a custom implementation to support platform projects with access control and other features.
The logic has been isolated to this file to avoid potential conflicts with the open-source modules from upstream
*/

import {
    assertNotNullOrUndefined,
    Cursor,
    EndpointScope,
    FlowStatus,
    isNil,
    Metadata,
    PiecesFilterType,
    PlatformId,
    Project,
    ProjectId,
    ProjectType,
    ProjectWithLimits,
    SeekPage,
    spreadIfDefined,
    UserId,
    UserStatus,
} from '@activepieces/shared'
import { FastifyBaseLogger } from 'fastify'
import { Equal, ILike, In } from 'typeorm'
import { appConnectionService } from '../../app-connection/app-connection-service/app-connection-service'
import { repoFactory } from '../../core/db/repo-factory'
import { transaction } from '../../core/db/transaction'
import { flowRepo } from '../../flows/flow/flow.repo'
import { flowService } from '../../flows/flow/flow.service'
import { buildPaginator } from '../../helper/pagination/build-paginator'
import { paginationHelper } from '../../helper/pagination/pagination-utils'
import { Order } from '../../helper/pagination/paginator'
import { ProjectEntity } from '../../project/project-entity'
import { projectService } from '../../project/project-service'
import { projectMemberRepo } from '../../project-member/project-member.service'
import { userService } from '../../user/user-service'

const projectRepo = repoFactory(ProjectEntity)

export const platformProjectService = (log: FastifyBaseLogger) => ({
    async getAllForPlatform(params: GetAllForParamsAndUser): Promise<SeekPage<ProjectWithLimits>> {
        const user = await userService.getOneOrFail({ id: params.userId })

        assertNotNullOrUndefined(user.platformId, 'User does not have a platform set')

        const projects = await projectService.getAllForUser({
            platformId: params.platformId,
            userId: params.userId,
            displayName: params.displayName,
            scope: params.scope,
        })

        return getProjects({ ...params, projectIds: projects.map((project) => project.id) }, log)
    },

    async getWithPlanAndUsageOrThrow(projectId: string): Promise<Project> {
        return projectRepo().findOneByOrFail({
            id: projectId,
        })
    },

    async update({ projectId, request }: UpdateParams): Promise<ProjectWithLimits> {
        const project = await projectService.getOneOrThrow(projectId)
        await projectService.update(projectId, {
            type: project.type,
            ...request,
        })
        return enrichProject(project, log)
    },

    async deletePersonalProjectForUser({ userId, platformId }: DeletePersonalProjectForUserParams): Promise<void> {
        const personalProject = await projectRepo().findOneBy({
            platformId,
            ownerId: userId,
            type: ProjectType.PERSONAL,
        })
        if (!isNil(personalProject)) {
            await this.hardDelete({ id: personalProject.id, platformId })
        }
    },

    async hardDelete({ id, platformId }: HardDeleteParams): Promise<void> {
        await transaction(async (entityManager) => {
            const allFlows = await flowRepo(entityManager).find({
                where: {
                    projectId: id,
                },
                select: {
                    id: true,
                },
            })
            await Promise.all(allFlows.map((flow) => flowService(log).delete({ id: flow.id, projectId: id })))
            await appConnectionService(log).deleteAllProjectConnections(id)
            await projectRepo(entityManager).delete({
                id,
                platformId,
            })
        })

    },
})

async function getProjects(params: GetAllParams & { projectIds?: string[] }, log: FastifyBaseLogger): Promise<SeekPage<ProjectWithLimits>> {
    const { cursorRequest, limit, platformId, displayName, externalId, projectIds, types } = params
    const decodedCursor = paginationHelper.decodeCursor(cursorRequest)
    const paginator = buildPaginator({
        entity: ProjectEntity,
        query: {
            limit,
            afterCursor: decodedCursor.nextCursor,
            beforeCursor: decodedCursor.previousCursor,
            orderBy: [
                {
                    field: 'type',
                    order: Order.ASC,
                },
                {
                    field: 'displayName',
                    order: Order.ASC,
                },
                {
                    field: 'id',
                    order: Order.ASC,
                },
            ],
        },
    })
    const displayNameFilter = displayName ? ILike(`%${displayName}%`) : undefined
    const filters = {
        platformId: Equal(platformId),
        ...spreadIfDefined('externalId', externalId),
        ...spreadIfDefined('displayName', displayNameFilter),
        ...(projectIds ? { id: In(projectIds) } : {}),
        ...(types ? { type: In(types) } : {}),
    }

    const queryBuilder = projectRepo()
        .createQueryBuilder('project')
        .where(filters)

    const { data, cursor } = await paginator.paginate(queryBuilder)
    const projects: ProjectWithLimits[] = await Promise.all(
        data.map((project) => enrichProject(project, log)),
    )
    return paginationHelper.createPage<ProjectWithLimits>(projects, cursor)
}

type DeletePersonalProjectForUserParams = {
    userId: UserId
    platformId: PlatformId
}

type GetAllForParamsAndUser = {
    userId: string
    scope?: EndpointScope
} & GetAllParams

type GetAllParams = {
    platformId: string
    displayName?: string
    externalId?: string
    cursorRequest: Cursor | null
    limit: number
    types?: ProjectType[]
}

export async function enrichProject(project: Project, log: FastifyBaseLogger): Promise<ProjectWithLimits> {
    const totalUsers = await projectMemberRepo().countBy({
        projectId: project.id,
    })
    const activeUsers = await projectMemberRepo()
        .createQueryBuilder('project_member')
        .leftJoin('user', 'user', 'user.id = project_member."userId"')
        .groupBy('user.id')
        .where('user.status = :activeStatus and project_member."projectId" = :projectId', {
            activeStatus: UserStatus.ACTIVE,
            projectId: project.id,
        })
        .getCount()

    const totalFlows = await flowService(log).count({
        projectId: project.id,
    })

    const activeFlows = await flowService(log).count({
        projectId: project.id,
        status: FlowStatus.ENABLED,
    })

    // todo(Rupal): Dummy plan
    return {
        ...project,
        plan: {
            id: project.id,
            projectId: project.id,
            created: project.created,
            updated: project.updated,
            locked: false,
            name: 'Default Plan',
            piecesFilterType: PiecesFilterType.ALLOWED,
            pieces: [],
        },
        analytics: {
            activeFlows,
            totalFlows,
            totalUsers,
            activeUsers,
        },
    }
}


type UpdateParams = {
    projectId: ProjectId
    request: UpdateProjectRequestParams
    platformId?: PlatformId
}

type UpdateProjectRequestParams = {
    displayName?: string
    externalId?: string
    releasesEnabled?: boolean
    metadata?: Metadata
}

type HardDeleteParams = {
    id: ProjectId
    platformId: PlatformId
}
