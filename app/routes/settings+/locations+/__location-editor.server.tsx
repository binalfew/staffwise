import { parseWithZod } from '@conform-to/zod'
import { ActionFunctionArgs, json } from '@remix-run/node'
import { z } from 'zod'
import { validateCSRF } from '~/utils/csrf.server'
import { prisma } from '~/utils/db.server'
import { checkHoneypot } from '~/utils/honeypot.server'
import { redirectWithToast } from '~/utils/toast.server'
import { LocationDeleteSchema, LocationEditorSchema } from './__location-editor'

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	checkHoneypot(formData)
	await validateCSRF(formData, request.headers)

	const intent = formData.get('intent')

	if (intent === 'delete') {
		const submission = await parseWithZod(formData, {
			schema: LocationDeleteSchema,
			async: true,
		})
		if (submission.status !== 'success') {
			return json(
				{ result: submission.reply() },
				{ status: submission.status === 'error' ? 400 : 200 },
			)
		}
		await prisma.location.delete({
			where: { id: submission.value.id },
		})

		return redirectWithToast('/settings/locations', {
			type: 'success',
			title: `Location Deleted`,
			description: `Location deleted successfully.`,
		})
	}

	const submission = await parseWithZod(formData, {
		schema: LocationEditorSchema.superRefine(async (data, ctx) => {
			const location = await prisma.location.findFirst({
				where: {
					name: data.name,
					organId: data.organId,
				},
				select: { id: true },
			})

			if (location && location.id !== data.id) {
				ctx.addIssue({
					path: ['name'],
					code: z.ZodIssueCode.custom,
					message:
						'Location with this name already exists in the selected organ.',
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

	const { id: locationId, name, code, organId } = submission.value

	const data = {
		name,
		code,
		organId,
	}

	await prisma.location.upsert({
		select: { id: true },
		where: { id: locationId ?? '__new_location__' },
		create: data,
		update: data,
	})

	return redirectWithToast('/settings/locations', {
		type: 'success',
		title: `Location ${locationId ? 'Updated' : 'Added'}`,
		description: `Location ${locationId ? 'updated' : 'added'} successfully.`,
	})
}
