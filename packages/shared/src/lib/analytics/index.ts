import { Static, Type } from '@sinclair/typebox'
import { BaseModelSchema } from '../common/base-model'


export const AnalyticsPieceReportItem = Type.Object({
    name: Type.String(),
    displayName: Type.String(),
    logoUrl: Type.String(),
    usageCount: Type.Number(),
})
export type AnalyticsPieceReportItem = Static<typeof AnalyticsPieceReportItem>

export const AnalyticsPieceReport = Type.Array(AnalyticsPieceReportItem)
export type AnalyticsPieceReport = Static<typeof AnalyticsPieceReport>

export const AnalyticsProjectReportItem = Type.Object({
    id: Type.String(),
    displayName: Type.String(),
    activeFlows: Type.Number(),
    totalFlows: Type.Number(),
})
export type AnalyticsProjectReportItem = Static<typeof AnalyticsProjectReportItem>

export const AnalyticsProjectReport = Type.Array(AnalyticsProjectReportItem)
export type AnalyticsProjectReport = Static<typeof AnalyticsProjectReport>

export const PlatformAnalyticsReport = Type.Object({
    ...BaseModelSchema,
    totalFlows: Type.Number(),
    activeFlows: Type.Number(),
    totalUsers: Type.Number(),
    activeUsers: Type.Number(),
    totalProjects: Type.Number(),
    activeProjects: Type.Number(),
    uniquePiecesUsed: Type.Number(),
    activeFlowsWithAI: Type.Number(),
    topPieces: AnalyticsPieceReport,
    tasksUsage: Type.Array(Type.Object({
        day: Type.String(),
        totalTasks: Type.Number(),
    })),
    topProjects: AnalyticsProjectReport,
    platformId: Type.String(),
})
export type PlatformAnalyticsReport = Static<typeof PlatformAnalyticsReport>

// Flow run analytics reports (custom)

export const GetAnalyticsParams = Type.Object({
    startDate: Type.String({ format: 'date' }),
    endDate: Type.String({ format: 'date' }),
})
export type GetAnalyticsParams = Static<typeof GetAnalyticsParams>

export const AnalyticsResponse = Type.Array(
    Type.Object({
        projectId: Type.String(),
        date: Type.String(),
        successfulFlowRuns: Type.Number(),
        failedFlowRuns: Type.Number(),
        successfulFlowRunsDuration: Type.Number(),
        failedFlowRunsDuration: Type.Number(),
    }),
)
export type AnalyticsResponse = Static<typeof AnalyticsResponse>

export const OverviewResponse = Type.Object({
    workflowCount: Type.Number(),
    activeWorkflowCount: Type.Number(),
    flowRunCount: Type.Number(),
})
export type OverviewResponse = Static<typeof OverviewResponse>
