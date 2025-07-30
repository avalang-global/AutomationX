import { FastifyBaseLogger } from 'fastify'
import { EmailSender } from '.'

export const dummyEmailSender = (log: FastifyBaseLogger): EmailSender => {
    return {
        async send({ emails, platformId, templateData }): Promise<void> {
            log.debug({
                name: 'DummyEmailSender#send',
                emails,
                platformId,
                templateData,
            })
        },
    }
}
