import { parseWithZod } from '@conform-to/zod'
import { ActionFunctionArgs, json } from '@remix-run/node'
import { z } from 'zod'
import { validateCSRF } from '~/utils/csrf.server'
import { prisma } from '~/utils/db.server'
import { checkHoneypot } from '~/utils/honeypot.server'
import { redirectWithToast } from '~/utils/toast.server'
import {
	IncidentTypeDeleteSchema,
	IncidentTypeEditorSchema,
} from './__incident-type-editor'

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	checkHoneypot(formData)
	await validateCSRF(formData, request.headers)

	const intent = formData.get('intent')

	if (intent === 'delete') {
		const submission = await parseWithZod(formData, {
			schema: IncidentTypeDeleteSchema,
			async: true,
		})
		if (submission.status !== 'success') {
			return json(
				{ result: submission.reply() },
				{ status: submission.status === 'error' ? 400 : 200 },
			)
		}
		await prisma.incidentType.delete({
			where: { id: submission.value.id },
		})

		return redirectWithToast('/settings/incident-types', {
			type: 'success',
			title: `Incident Type Deleted`,
			description: `Incident type deleted successfully.`,
		})
	}

	const submission = await parseWithZod(formData, {
		schema: IncidentTypeEditorSchema.superRefine(async (data, ctx) => {
			const incidentType = await prisma.incidentType.findFirst({
				where: { name: data.name },
				select: { id: true },
			})

			if (incidentType && incidentType.id !== data.id) {
				ctx.addIssue({
					path: ['name'],
					code: z.ZodIssueCode.custom,
					message: 'Incident type with this name already exists.',
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

	const { id: incidentTypeId, name, code } = submission.value

	const data = {
		name,
		code,
	}

	await prisma.incidentType.upsert({
		select: { id: true },
		where: { id: incidentTypeId ?? '__new_incident_type__' },
		create: {
			...data,
		},
		update: {
			...data,
		},
	})

	return redirectWithToast('/settings/incident-types', {
		type: 'success',
		title: `Incident Type ${incidentTypeId ? 'Updated' : 'Created'}`,
		description: `Incident Type ${
			incidentTypeId ? 'updated' : 'created'
		} successfully.`,
	})
}
