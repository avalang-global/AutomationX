import { Static, Type } from '@sinclair/typebox'
import { BaseModelSchema, Nullable } from '../common/base-model'
import { FlowStatus } from '../flows/flow'
import { UserWithMetaInformation } from '../user'

export enum AnalyticsTimePeriod {
    LAST_WEEK = 'last-week',
    LAST_MONTH = 'last-month',
    ALL_TIME = 'all-time',
}

export const AnalyticsRunsUsageItem = Type.Object({
    day: Type.String(),
    flowId: Type.String(),
    runs: Type.Number(),
})
export type AnalyticsRunsUsageItem = Static<typeof AnalyticsRunsUsageItem>

export const AnalyticsRunsUsage = Type.Array(AnalyticsRunsUsageItem)
export type AnalyticsRunsUsage = Static<typeof AnalyticsRunsUsage>

export const AnalyticsFlowReportItem = Type.Object({
    flowId: Type.String(),
    flowName: Type.String(),
    projectId: Type.String(),
    projectName: Type.String(),
    status: Type.Enum(FlowStatus),
    timeSavedPerRun: Nullable(Type.Number()),
    ownerId: Nullable(Type.String()),
})
export type AnalyticsFlowReportItem = Static<typeof AnalyticsFlowReportItem>

export const AnalyticsFlowReport = Type.Array(AnalyticsFlowReportItem)
export type AnalyticsFlowReport = Static<typeof AnalyticsFlowReport>

export const PlatformAnalyticsReport = Type.Object({
    ...BaseModelSchema,
    cachedAt: Type.String(),
    runs: AnalyticsRunsUsage,
    outdated: Type.Boolean(),
    flows: AnalyticsFlowReport,
    platformId: Type.String(),
    users: Type.Array(UserWithMetaInformation),
})
export type PlatformAnalyticsReport = Static<typeof PlatformAnalyticsReport>

export const ProjectLeaderboardItem = Type.Object({
    projectId: Type.String(),
    projectName: Type.String(),
    flowCount: Type.Number(),
    minutesSaved: Nullable(Type.Number()),
})
export type ProjectLeaderboardItem = Static<typeof ProjectLeaderboardItem>

export const UserLeaderboardItem = Type.Object({
    userId: Type.String(),
    flowCount: Type.Number(),
    minutesSaved: Nullable(Type.Number()),
})
export type UserLeaderboardItem = Static<typeof UserLeaderboardItem>

export const AnalyticsReportRequest = Type.Object({
    timePeriod: Type.Optional(Type.Enum(AnalyticsTimePeriod)),
})
export type AnalyticsReportRequest = Static<typeof AnalyticsReportRequest>

export const LeaderboardRequest = Type.Object({
    timePeriod: Type.Enum(AnalyticsTimePeriod),
})
export type LeaderboardRequest = Static<typeof LeaderboardRequest>

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
