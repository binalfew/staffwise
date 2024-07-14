import { EmailClient, KnownEmailSendStatus } from '@azure/communication-email'

export async function sendEmail(options: {
	to: string
	subject: string
	plainText: string
	html?: string
}): Promise<void> {
	const { to, subject, plainText, html } = options
	const POLLER_WAIT_TIME = 10
	const message = {
		senderAddress:
			'DoNotReply@149e17cc-e142-4d9f-960a-67c1e13cc0db.azurecomm.net',
		recipients: {
			to: [{ address: to }],
		},
		content: {
			subject,
			plainText,
			html,
		},
	}

	try {
		const client = new EmailClient(process.env.EMAIL_CONNECTION_STRING || '')
		const poller = await client.beginSend(message)

		if (!poller.getOperationState().isStarted) {
			throw 'Poller was not started.'
		}

		let timeElapsed = 0
		while (!poller.isDone()) {
			poller.poll()
			console.log('Email send polling in progress')

			await new Promise(resolve => setTimeout(resolve, POLLER_WAIT_TIME * 1000))
			timeElapsed += 10

			if (timeElapsed > 18 * POLLER_WAIT_TIME) {
				throw 'Polling timed out.'
			}
		}

		if (poller.getResult()?.status === KnownEmailSendStatus.Succeeded) {
			console.log(
				`Successfully sent the email (operation id: ${poller.getResult()?.id})`,
			)
		} else {
			throw poller.getResult()?.error
		}
	} catch (error) {
		console.error('Failed to send email with error:', error)
	}
}
