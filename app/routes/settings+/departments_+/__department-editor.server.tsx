import { parseWithZod } from '@conform-to/zod'
import { ActionFunctionArgs, json, redirect } from '@remix-run/node'
import { z } from 'zod'
import { validateCSRF } from '~/utils/csrf.server'
import { prisma } from '~/utils/db.server'
import { checkHoneypot } from '~/utils/honeypot.server'
import {
	DepartmentDeleteSchema,
	DepartmentEditorSchema,
} from './__department-editor'

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	checkHoneypot(formData)
	await validateCSRF(formData, request.headers)

	const intent = formData.get('intent')

	if (intent === 'delete') {
		const submission = await parseWithZod(formData, {
			schema: DepartmentDeleteSchema,
			async: true,
		})
		if (submission.status !== 'success') {
			return json(
				{ result: submission.reply() },
				{ status: submission.status === 'error' ? 400 : 200 },
			)
		}
		await prisma.department.delete({
			where: { id: submission.value.id },
		})
		return redirect('/settings/departments')
	}

	const submission = await parseWithZod(formData, {
		schema: DepartmentEditorSchema.superRefine(async (data, ctx) => {
			const department = await prisma.department.findFirst({
				where: {
					name: data.name,
					organId: data.organId,
				},
				select: { id: true },
			})

			if (department && department.id !== data.id) {
				ctx.addIssue({
					path: ['name'],
					code: z.ZodIssueCode.custom,
					message:
						'Department with this name already exists in the selected organ.',
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

	const { id: departmentId, name, code, organId } = submission.value

	const data = {
		name,
		code,
		organId,
	}

	await prisma.department.upsert({
		select: { id: true },
		where: { id: departmentId ?? '__new_department__' },
		create: data,
		update: data,
	})

	return redirect('/settings/departments')
}
