import { assertNotNullOrUndefined } from '@activepieces/shared'
import { FastifyBaseLogger } from 'fastify'
import { SystemJobData, SystemJobName } from '../../helper/system-jobs/common'
import { systemJobsSchedule } from '../../helper/system-jobs/system-job'
import { flowExecutionCache } from './flow-execution-cache'
import { flowSideEffects } from './flow-service-side-effects'
import { flowRepo } from './flow.repo'

export const flowBackgroundJobs = (log: FastifyBaseLogger) => ({

    deleteHandler: async (data: SystemJobData<SystemJobName.DELETE_FLOW>) => {
        const { flow, preDeleteDone, dbDeleteDone } = data
        const job = await systemJobsSchedule(log).getJob(`delete-flow-${flow.id}`)
        assertNotNullOrUndefined(job, 'job is required')
        if (!preDeleteDone) {
            await flowSideEffects(log).preDelete({
                flowToDelete: flow,
            })
            await job.updateData({
                ...data,
                preDeleteDone: true,
            })
        }
        if (!dbDeleteDone) {
            await flowRepo().delete({ id: flow.id })
            await job.updateData({
                ...data,
                preDeleteDone: true,
                dbDeleteDone: true,
            })
        }
        await flowExecutionCache(log).invalidate(flow.id)
    },
})
