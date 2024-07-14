import { type HttpHandler } from 'msw'
// import { z } from 'zod'

// const { json } = HttpResponse

// const EmailSchema = z.object({
// 	senderAddress: z.string(),
// 	recipients: z.object({
// 		to: z.array(z.object({ address: z.string() })),
// 	}),
// 	content: z.object({
// 		subject: z.string(),
// 		plainText: z.string(),
// 		html: z.string().optional(),
// 	}),
// })

export const handlers: Array<HttpHandler> = [
	// http.post(
	// 	`https://staffwise-communication-service.europe.communication.azure.com/emails:send`,
	// 	async ({ request }) => {
	// 		const body = EmailSchema.parse(await request.json())
	// 		console.info('🔶 mocked email contents:', body)
	// 		return json(
	// 			{
	// 				id: faker.string.uuid(),
	// 				status: 'InProgress',
	// 				senderAddress: body.senderAddress,
	// 				recipients: body.recipients,
	// 				content: body.content,
	// 			},
	// 			{
	// 				status: 202,
	// 			},
	// 		)
	// 	},
	// ),
]
