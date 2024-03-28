import { parseWithZod } from '@conform-to/zod'
import { ActionFunctionArgs, json } from '@remix-run/node'
import { z } from 'zod'
import { validateCSRF } from '~/utils/csrf.server'
import { prisma } from '~/utils/db.server'
import { checkHoneypot } from '~/utils/honeypot.server'
import { redirectWithToast } from '~/utils/toast.server'
import {
	RelationshipDeleteSchema,
	RelationshipEditorSchema,
} from './__relationship-editor'

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	checkHoneypot(formData)
	await validateCSRF(formData, request.headers)

	const intent = formData.get('intent')

	if (intent === 'delete') {
		const submission = await parseWithZod(formData, {
			schema: RelationshipDeleteSchema,
			async: true,
		})
		if (submission.status !== 'success') {
			return json(
				{ result: submission.reply() },
				{ status: submission.status === 'error' ? 400 : 200 },
			)
		}
		await prisma.relationship.delete({
			where: { id: submission.value.id },
		})

		return redirectWithToast('/settings/relationships', {
			type: 'success',
			title: `Relationship Deleted`,
			description: `Relationship deleted successfully.`,
		})
	}

	const submission = await parseWithZod(formData, {
		schema: RelationshipEditorSchema.superRefine(async (data, ctx) => {
			const relationship = await prisma.relationship.findFirst({
				where: {
					name: data.name,
				},
				select: { id: true },
			})

			if (relationship && relationship.id !== data.id) {
				ctx.addIssue({
					path: ['name'],
					code: z.ZodIssueCode.custom,
					message: 'Relationship with this name already exists.',
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

	const { id: relationshipId, name, code } = submission.value

	const data = {
		name,
		code,
	}

	await prisma.relationship.upsert({
		select: { id: true },
		where: { id: relationshipId ?? '__new_relationship__' },
		create: data,
		update: data,
	})

	return redirectWithToast('/settings/relationships', {
		type: 'success',
		title: `Relationship Saved`,
		description: `Relationship saved successfully.`,
	})
}
