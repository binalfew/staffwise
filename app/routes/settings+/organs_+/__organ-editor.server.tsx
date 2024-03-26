import { parseWithZod } from '@conform-to/zod'
import { ActionFunctionArgs, json, redirect } from '@remix-run/node'
import { z } from 'zod'
import { validateCSRF } from '~/utils/csrf.server'
import { prisma } from '~/utils/db.server'
import { checkHoneypot } from '~/utils/honeypot.server'
// Assume similar schemas exist for Organ, adjust accordingly
import { OrganDeleteSchema, OrganEditorSchema } from './__organ-editor'

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	checkHoneypot(formData)
	await validateCSRF(formData, request.headers)

	const intent = formData.get('intent')

	if (intent === 'delete') {
		const submission = await parseWithZod(formData, {
			schema: OrganDeleteSchema,
			async: true,
		})
		if (submission.status !== 'success') {
			return json(
				{ result: submission.reply() },
				{ status: submission.status === 'error' ? 400 : 200 },
			)
		}
		await prisma.organ.delete({
			where: { id: submission.value.id },
		})
		return redirect('/settings/organs')
	}

	const submission = await parseWithZod(formData, {
		schema: OrganEditorSchema.superRefine(async (data, ctx) => {
			const organ = await prisma.organ.findFirst({
				where: {
					name: data.name,
					countryId: data.countryId,
				},
				select: { id: true },
			})

			if (organ && organ.id !== data.id) {
				ctx.addIssue({
					path: ['name'],
					code: z.ZodIssueCode.custom,
					message:
						'Organ with this name already exists in the selected country.',
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

	const { id: organId, name, code, address, countryId } = submission.value

	const data = {
		name,
		code,
		address,
		countryId,
	}

	await prisma.organ.upsert({
		select: { id: true },
		where: { id: organId ?? '__new_organ__' },
		create: data,
		update: data,
	})

	return redirect('/settings/organs')
}
