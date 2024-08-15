import { parseWithZod } from '@conform-to/zod'
import { ActionFunctionArgs, json } from '@remix-run/node'
import { z } from 'zod'
import { validateCSRF } from '~/utils/csrf.server'
import { prisma } from '~/utils/db.server'
import { checkHoneypot } from '~/utils/honeypot.server'
import { redirectWithToast } from '~/utils/toast.server'
import {
	PermissionDeleteSchema,
	PermissionEditorSchema,
} from './__permission-editor'

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	checkHoneypot(formData)
	await validateCSRF(formData, request.headers)

	const intent = formData.get('intent')

	if (intent === 'delete') {
		const submission = await parseWithZod(formData, {
			schema: PermissionDeleteSchema,
			async: true,
		})
		if (submission.status !== 'success') {
			return json(
				{ result: submission.reply() },
				{ status: submission.status === 'error' ? 400 : 200 },
			)
		}
		await prisma.permission.delete({
			where: { id: submission.value.id },
		})

		return redirectWithToast('/settings/permissions', {
			type: 'success',
			title: `Permission Deleted`,
			description: `Permission deleted successfully.`,
		})
	}

	const submission = await parseWithZod(formData, {
		schema: PermissionEditorSchema.superRefine(async (data, ctx) => {
			const role = await prisma.permission.findUnique({
				where: {
					action_entity_access: {
						entity: data.entity,
						action: data.action,
						access: data.access,
					},
				},
				select: { id: true },
			})

			if (role && role.id !== data.id) {
				ctx.addIssue({
					path: ['entity'],
					code: z.ZodIssueCode.custom,
					message:
						'Permission with this entity, action and access already exists.',
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

	const {
		id: permissionId,
		entity,
		action,
		access,
		description,
	} = submission.value

	const data = {
		entity,
		action,
		access,
		description,
	}

	await prisma.permission.upsert({
		select: { id: true },
		where: { id: permissionId ?? '__new_permission__' },
		create: data,
		update: data,
	})

	return redirectWithToast('/settings/permissions', {
		type: 'success',
		title: `Permission ${permissionId ? 'Updated' : 'Created'}`,
		description: `Permission ${
			permissionId ? 'updated' : 'created'
		} successfully.`,
	})
}
