// Schema for deleting a floor entity, typically needing only the id
import { parseWithZod } from '@conform-to/zod'
import { ActionFunctionArgs, json } from '@remix-run/node'
import { z } from 'zod'
import { validateCSRF } from '~/utils/csrf.server'
import { prisma } from '~/utils/db.server'
import { checkHoneypot } from '~/utils/honeypot.server'
import { redirectWithToast } from '~/utils/toast.server'
import { FloorDeleteSchema, FloorEditorSchema } from './__floor-editor'

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	checkHoneypot(formData)
	await validateCSRF(formData, request.headers)
	const intent = formData.get('intent')

	if (intent === 'delete') {
		const submission = await parseWithZod(formData, {
			schema: FloorDeleteSchema,
			async: true,
		})
		if (submission.status !== 'success') {
			return json(
				{ result: submission.reply() },
				{ status: submission.status === 'error' ? 400 : 200 },
			)
		}
		await prisma.floor.delete({
			where: { id: submission.value.id },
		})

		return redirectWithToast('/settings/floors', {
			type: 'success',
			title: `Floor Deleted`,
			description: `Floor deleted successfully.`,
		})
	}

	const submission = await parseWithZod(formData, {
		schema: FloorEditorSchema.superRefine(async (data, ctx) => {
			const floor = await prisma.floor.findFirst({
				where: {
					name: data.name,
					locationId: data.locationId,
				},
				select: { id: true },
			})

			if (floor && floor.id !== data.id) {
				ctx.addIssue({
					path: ['name'],
					code: z.ZodIssueCode.custom,
					message:
						'Floor with this name already exists in the selected location.',
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

	const { id: floorId, name, code, locationId } = submission.value

	const data = {
		name,
		code,
		locationId,
	}

	await prisma.floor.upsert({
		select: { id: true },
		where: { id: floorId ?? '__new_floor__' },
		create: data,
		update: data,
	})

	return redirectWithToast('/settings/floors', {
		type: 'success',
		title: `Floor ${floorId ? 'Updated' : 'Created'}`,
		description: `Floor ${floorId ? 'updated' : 'created'} successfully.`,
	})
}
