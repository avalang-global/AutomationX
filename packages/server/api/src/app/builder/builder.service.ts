import { AIUsageFeature, createAIModel } from '@activepieces/common-ai'
import { AppSystemProp } from '@activepieces/server-shared'
import {
    apId,
    assertNotNullOrUndefined,
    BuilderMessage,
    BuilderMessageRole,
    FlowAction,
    flowStructureUtil,
    FlowTrigger,
    FlowVersion,
    FlowVersionState,
} from '@activepieces/shared'
import { createOpenAI, openai } from '@ai-sdk/openai'
import { LanguageModelV2 } from '@ai-sdk/provider'
import {
    AssistantModelMessage,
    generateText,
    GenerateTextResult,
    LanguageModelUsage,
    ModelMessage,
    stepCountIs,
    ToolContent,
    ToolModelMessage,
    UserModelMessage,
} from 'ai'
import dayjs from 'dayjs'
import { FastifyBaseLogger } from 'fastify'
import { accessTokenManager } from '../authentication/lib/access-token-manager'
import { repoFactory } from '../core/db/repo-factory'
import { flowService } from '../flows/flow/flow.service'
import { flowVersionService } from '../flows/flow-version/flow-version.service'
import { domainHelper } from '../helper/domain-helper'
import { system } from '../helper/system/system'
import { platformPlanService } from '../platform-plan/platform-plan.service'
import { buildBuilderTools } from './builder.tools'
import { BuilderOpenAiModel, builderSystemPrompt } from './constants'
import { BuilderMessageEntity } from './message.entity'

/*
 * Strips a FlowVersion of unnecessary metadata before sending it to the AI model.
 * The goal is to reduce token usage and prevent the model from being distracted
 * by attributes it doesn’t need to know in order to reason about the flow.
 *
 * Example of final stripped format:
 *
 * {
 *   "displayName": "test",
 *   "trigger": {
 *     "name": "trigger",
 *     "type": "PIECE_TRIGGER",
 *     "valid": false,
 *     "settings": {
 *       "pieceName": "@activepieces/piece-slack",
 *       "triggerName": "new-message",
 *       "pieceVersion": "~0.10.2"
 *     },
 *     "nextAction": {
 *       "name": "send_email",
 *       "type": "PIECE",
 *       "settings": {
 *         "pieceName": "@activepieces/piece-gmail",
 *         "actionName": "send_email",
 *         "pieceVersion": "~0.8.4"
 *       },
 *       "nextAction": {
 *         "name": "send_request",
 *         "type": "PIECE",
 *         "settings": {
 *           "pieceName": "@activepieces/piece-http",
 *           "actionName": "send_request",
 *           "pieceVersion": "~0.8.4"
 *         }
 *       }
 *     }
 *   }
 * }
 */
const stripFlowVersionForAiPrompt = (flowVersion: FlowVersion): string => {
    // Traverse the flow structure and clean each step
    const minimalFlowVersion = flowStructureUtil.transferFlow(
        flowVersion,
        (step) => {
            const cleaned = { ...step }

            // Remove unneeded step settings metadata
            if (cleaned.settings) {
                delete cleaned.settings.errorHandlingOptions
                delete cleaned.settings.inputUiInfo
                delete cleaned.settings.connectionIds
                delete cleaned.settings.agentIds
                delete cleaned.settings.input
                delete cleaned.settings.inputUiInfo // duplicate remove to be safe
            }

            // Remove extra fields from triggers
            if (flowStructureUtil.isTrigger(cleaned.type)) {
                delete (cleaned as Partial<FlowTrigger>).displayName
            }

            // Remove extra fields from actions
            if (flowStructureUtil.isAction(cleaned.type)) {
                delete (cleaned as Partial<FlowAction>).valid
                delete (cleaned as Partial<FlowAction>).displayName
            }

            return cleaned
        },
    )

    // Remove top-level metadata that’s irrelevant to the AI
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, created, updated, flowId, connectionIds, agentIds, updatedBy, valid, state, schemaVersion, ...rest } = minimalFlowVersion

    // Return as pretty-printed JSON for easier reading in the prompt
    return JSON.stringify(rest, null, 2)
}

const userOpenAiModel = async (platformId: string, projectId: string): Promise<LanguageModelV2> => {
    const engineToken = await accessTokenManager.generateEngineToken({
        projectId,
        platformId,
    })
    const baseURL = await domainHelper.getPublicApiUrl({
        path: '/v1/ai-providers/proxy/openai',
        platformId,
    })
    const model = createAIModel({
        providerName: 'openai',
        modelInstance: openai(BuilderOpenAiModel),
        engineToken,
        baseURL,
        metadata: {
            feature: AIUsageFeature.TEXT_AI,
        },
    })
    return model
}

const promptxOpenAiModel = async (): Promise<LanguageModelV2> => {
    const openAiKey = system.getOrThrow(AppSystemProp.PROMPTX_OPENAI_KEY)
    const provider = createOpenAI({ apiKey: openAiKey })
    return provider(BuilderOpenAiModel)
}

const selectOpenAiModel = async (platformId: string, projectId: string): Promise<LanguageModelV2> => {
    if (system.isStandaloneVersion()) {
        return userOpenAiModel(platformId, projectId)
    }
    return promptxOpenAiModel()
}

const builderMessagesRepo = repoFactory(BuilderMessageEntity)

export const builderService = (log: FastifyBaseLogger) => ({
    async fetchMessages(params: FetchMessagesParams): Promise<BuilderMessage[]> {
        const { limit, ...rest } = params
        const upperLimit = limit ? limit + 10 : undefined
        const messages = await builderMessagesRepo().find({ where: rest, order: { created: 'DESC' }, take: upperLimit })
        const sortedItems = messages.reverse()
        let result = sortedItems

        if (limit && sortedItems.length > limit) {
            const excess = sortedItems.length - limit
            for (let i = excess; i >= 0; i--) {
                if (sortedItems[i].role !== BuilderMessageRole.TOOL) {
                    result = sortedItems.slice(i)
                    break
                }
            }
        }
        try {
            return result.map((m) => ({ ...m, content: JSON.parse(m.content) }))
        }
        catch (error) {
            log.error(`Unable to fetch builder messages due to error ${error instanceof Error ? error.message : error}`)
        }
        return []
    },
    async saveMessages(params: SaveMessagesParams): Promise<void> {
        const { projectId, flowId, messages, usage } = params
        const timeNow = dayjs()
        const internalMessages: BuilderMessage[] = messages.map((m, i) => ({
            id: apId(),
            projectId,
            flowId,
            created: timeNow.add(i, 'millisecond').toISOString(),
            updated: timeNow.add(i, 'millisecond').toISOString(),
            role: m.role as BuilderMessageRole,
            content: JSON.stringify(m.content),
            usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        }))
        if (internalMessages.length) {
            internalMessages[internalMessages.length - 1].usage = {
                inputTokens: usage?.inputTokens ?? 0,
                outputTokens: usage?.outputTokens ?? 0,
                totalTokens: usage?.totalTokens ?? 0,
            }
        }
        await builderMessagesRepo().insert(internalMessages)
    },
    async runAndUpdate({ userId, projectId, platformId, flowId, messages }: RunParams): Promise<GenerateTextResult<ReturnType<typeof buildBuilderTools>, string>> {
        const flow = await flowService(log).getOneOrThrow({
            projectId,
            id: flowId,
        })
        const flowVersion = await flowVersionService(log).getLatestVersion(flowId, FlowVersionState.DRAFT)
        assertNotNullOrUndefined(flowVersion, 'No draft flow version found')

        const systemWithFlowPrompt = builderSystemPrompt + '\n' + 'Current flow:\n' + stripFlowVersionForAiPrompt(flowVersion)
        // log.info(systemWithFlowPrompt)

        const userMessage: UserModelMessage = { role: 'user', content: messages[messages.length - 1].content }
        const oldMessages = await builderService(log).fetchMessages({ projectId, flowId, limit: 10 })
        const oldModelMessages: ModelMessage[] = oldMessages.map((o) => {
            if (o.role === BuilderMessageRole.ASSISTANT) return { role: 'assistant', content: o.content }
            if (o.role === BuilderMessageRole.USER) return { role: 'user', content: o.content }
            return { role: 'tool', content: o.content as unknown as ToolContent }
        })
        // log.info(JSON.stringify(oldModelMessages))

        const model = await selectOpenAiModel(platformId, projectId)
        const result = await generateText({
            model,
            stopWhen: stepCountIs(10),
            messages: [
                { role: 'system', content: systemWithFlowPrompt },
                userMessage,
                ...oldModelMessages,
            ],
            tools: buildBuilderTools({ userId, projectId, platformId, flow, flowVersion }),
        })

        if (result.usage) {
            log.info(result.usage, 'builder ai usage')
            await platformPlanService(log).publishTokenUsage(projectId, result.usage)
        }

        await builderService(log).saveMessages({ projectId, flowId, messages: [ userMessage ] })
        await builderService(log).saveMessages({ projectId, flowId, messages: result.response.messages, usage: result.usage })

        return result
    },
})

type ChatMessage = {
    role: 'system' | 'user' | 'assistant'
    content: string
}

type FetchMessagesParams = {
    projectId: string
    flowId: string
    limit?: number
}

type SaveMessagesParams = {
    projectId: string
    flowId: string
    messages: (UserModelMessage | AssistantModelMessage | ToolModelMessage)[]
    usage?: LanguageModelUsage
}

type RunParams = {
    userId: string
    projectId: string
    platformId: string
    flowId: string
    messages: ChatMessage[]
}
