import { parseWithZod } from '@conform-to/zod'
import { ActionFunctionArgs, json } from '@remix-run/node'
import { z } from 'zod'
import { validateCSRF } from '~/utils/csrf.server'
import { prisma } from '~/utils/db.server'
import { checkHoneypot } from '~/utils/honeypot.server'
import { redirectWithToast } from '~/utils/toast.server'
import { UserDeleteSchema, UserEditorSchema } from './__user-editor'

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	checkHoneypot(formData)
	await validateCSRF(formData, request.headers)

	const intent = formData.get('intent')

	if (intent === 'delete') {
		const submission = await parseWithZod(formData, {
			schema: UserDeleteSchema,
			async: true,
		})
		if (submission.status !== 'success') {
			return json(
				{ result: submission.reply() },
				{ status: submission.status === 'error' ? 400 : 200 },
			)
		}
		await prisma.country.delete({
			where: { id: submission.value.id },
		})

		return redirectWithToast('/settings/countries', {
			type: 'success',
			title: `Country Deleted`,
			description: `Country deleted successfully.`,
		})
	}

	const submission = await parseWithZod(formData, {
		schema: UserEditorSchema.superRefine(async (data, ctx) => {
			const user = await prisma.user.findUnique({
				where: { email: data.email },
				select: { id: true },
			})

			if (user && user.id !== data.id) {
				ctx.addIssue({
					path: ['email'],
					code: z.ZodIssueCode.custom,
					message: 'User with this email already exists.',
				})
				return
			}
		}),
		async: true,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { id: userId, name, email, username } = submission.value

	const data = {
		name,
		email,
		username,
	}

	await prisma.user.upsert({
		select: { id: true },
		where: { id: userId ?? '__new_user__' },
		create: data,
		update: data,
	})

	return redirectWithToast('/settings/users', {
		type: 'success',
		title: `User ${userId ? 'Updated' : 'Created'}`,
		description: `User ${userId ? 'updated' : 'created'} successfully.`,
	})
}
