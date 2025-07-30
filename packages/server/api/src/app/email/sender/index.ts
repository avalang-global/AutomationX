import { AppSystemProp } from '@activepieces/server-shared'
import { ApEnvironment } from '@activepieces/shared'
import { FastifyBaseLogger } from 'fastify'
import { system } from '../../helper/system/system'
import { dummyEmailSender } from './dummy'
import { smtpEmailSender } from './smtp'

type BaseEmailTemplateData<Name extends string, Vars extends Record<string, string>> = {
    name: Name
    vars: Vars
}

type InvitationEmailTemplateData = BaseEmailTemplateData<'invitation-email', {
    projectOrPlatformName: string
    invitationLink: string
}>

export type EmailTemplateData = InvitationEmailTemplateData

type SendEmailParams = {
    emails: string[]
    platformId: string | undefined
    templateData: EmailTemplateData
}

export type EmailSender = {
    send: (args: SendEmailParams) => Promise<void>
}

const getEmailSender = (log: FastifyBaseLogger): EmailSender => {
    const env = system.get(AppSystemProp.ENVIRONMENT)

    if (env === ApEnvironment.PRODUCTION) {
        return smtpEmailSender(log)
    }

    return dummyEmailSender(log)
}

export const emailSender = (log: FastifyBaseLogger): EmailSender => getEmailSender(log)
