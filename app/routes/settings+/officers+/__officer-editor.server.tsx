import { parseWithZod } from '@conform-to/zod'
import { OfficerType } from '@prisma/client'
import { ActionFunctionArgs, json } from '@remix-run/node'
import { z } from 'zod'
import { validateCSRF } from '~/utils/csrf.server'
import { prisma } from '~/utils/db.server'
import { checkHoneypot } from '~/utils/honeypot.server'
import { invariantResponse } from '~/utils/misc'
import { redirectWithToast } from '~/utils/toast.server'
import { OfficerDeleteSchema, OfficerEditorSchema } from './__officer-editor'

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	checkHoneypot(formData)
	await validateCSRF(formData, request.headers)

	const intent = formData.get('intent')

	if (intent === 'delete') {
		const submission = await parseWithZod(formData, {
			schema: OfficerDeleteSchema,
			async: true,
		})
		if (submission.status !== 'success') {
			return json(
				{ result: submission.reply() },
				{ status: submission.status === 'error' ? 400 : 200 },
			)
		}
		await prisma.officer.delete({
			where: { id: submission.value.id },
		})

		return redirectWithToast('/settings/officers', {
			type: 'success',
			title: `Officer Deleted`,
			description: `Officer deleted successfully.`,
		})
	}

	const submission = await parseWithZod(formData, {
		schema: OfficerEditorSchema.superRefine(async (data, ctx) => {
			const employee = await prisma.employee.findFirst({
				where: {
					email: {
						equals: data.email,
						mode: 'insensitive',
					},
				},
				select: { id: true },
			})

			const officer = await prisma.officer.findFirst({
				where: { employeeId: employee?.id, type: data.type as OfficerType },
				select: { id: true },
			})

			if (officer && officer.id !== data.id) {
				ctx.addIssue({
					path: ['email'],
					code: z.ZodIssueCode.custom,
					message: `Officer with this ${data.type} already exists.`,
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

	const { id: officerId, email, type, isActive } = submission.value
	console.log(submission.value)

	const employee = await prisma.employee.findFirst({
		where: {
			email: {
				equals: email,
				mode: 'insensitive',
			},
		},
		select: { id: true },
	})

	invariantResponse(employee, 'Employee not found', {
		status: 404,
	})

	const data = {
		type: type as OfficerType,
		employeeId: employee?.id,
		isActive: isActive ?? false,
	}

	await prisma.officer.upsert({
		select: { id: true },
		where: { id: officerId ?? '__new_officer__' },
		create: {
			...data,
		},
		update: {
			...data,
		},
	})

	return redirectWithToast('/settings/officers', {
		type: 'success',
		title: `Officer ${officerId ? 'Updated' : 'Created'}`,
		description: `Officer ${officerId ? 'updated' : 'created'} successfully.`,
	})
}
