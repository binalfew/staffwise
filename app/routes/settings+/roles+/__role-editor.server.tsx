import { parseWithZod } from '@conform-to/zod'
import { ActionFunctionArgs, json } from '@remix-run/node'
import { z } from 'zod'
import { validateCSRF } from '~/utils/csrf.server'
import { prisma } from '~/utils/db.server'
import { checkHoneypot } from '~/utils/honeypot.server'
import { redirectWithToast } from '~/utils/toast.server'
import { RoleDeleteSchema, RoleEditorSchema } from './__role-editor'

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	checkHoneypot(formData)
	await validateCSRF(formData, request.headers)

	const intent = formData.get('intent')

	if (intent === 'delete') {
		const submission = await parseWithZod(formData, {
			schema: RoleDeleteSchema,
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
		schema: RoleEditorSchema.superRefine(async (data, ctx) => {
			const role = await prisma.role.findFirst({
				where: { name: data.name },
				select: { id: true },
			})

			if (role && role.id !== data.id) {
				ctx.addIssue({
					path: ['name'],
					code: z.ZodIssueCode.custom,
					message: 'Role with this name already exists.',
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

	const { id: roleId, name, description } = submission.value

	const data = {
		name,
		description,
	}

	await prisma.role.upsert({
		select: { id: true },
		where: { id: roleId ?? '__new_role__' },
		create: data,
		update: data,
	})

	return redirectWithToast('/settings/roles', {
		type: 'success',
		title: `Role ${roleId ? 'Updated' : 'Created'}`,
		description: `Role ${roleId ? 'updated' : 'created'} successfully.`,
	})
}
