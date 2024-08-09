import { parseWithZod } from '@conform-to/zod'
import { ActionFunctionArgs, json } from '@remix-run/node'
import { insertAuditLog } from '~/utils/audit.server'
import { requireUser } from '~/utils/auth.server'
import { validateCSRF } from '~/utils/csrf.server'
import { prisma } from '~/utils/db.server'
import { checkHoneypot } from '~/utils/honeypot.server'
import { invariantResponse } from '~/utils/misc'
import { redirectWithToast } from '~/utils/toast.server'
import {
	DependantDeleteSchema,
	DependantEditorSchema,
} from './__dependant-editor'

export async function action({ request }: ActionFunctionArgs) {
	const user = await requireUser(request)
	const formData = await request.formData()
	checkHoneypot(formData)
	await validateCSRF(formData, request.headers)

	const intent = formData.get('intent')

	if (intent === 'delete') {
		const submission = await parseWithZod(formData, {
			schema: DependantDeleteSchema,
			async: true,
		})

		if (submission.status !== 'success') {
			return json(
				{ result: submission.reply() },
				{ status: submission.status === 'error' ? 400 : 200 },
			)
		}

		await prisma.dependant.delete({
			where: { id: submission.value.id },
		})

		return redirectWithToast(`/profile/${user.id}/dependants`, {
			type: 'success',
			title: 'Dependant Deleted',
			description: 'Dependant entry deleted successfully.',
		})
	}

	const submission = await parseWithZod(formData, {
		schema: DependantEditorSchema,
		async: true,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const employee = await prisma.employee.findFirst({
		where: {
			email: {
				equals: user.email,
				mode: 'insensitive',
			},
		},
		select: { id: true },
	})

	invariantResponse(employee, 'Employee not found', { status: 404 })

	const { id: dependantId, ...dependantDetails } = submission.value

	const data = {
		employeeId: employee.id,
		...dependantDetails,
	}

	await prisma.dependant.upsert({
		where: { id: dependantId ?? '__new_dependant__' },
		create: data,
		update: data,
	})

	await insertAuditLog({
		user: { id: user.id },
		action: dependantId ? 'UPDATE' : 'CREATE',
		entity: 'Dependant',
		details: {
			...data,
			id: dependantId,
		},
	})

	return redirectWithToast(`/profile/${user.id}/dependants`, {
		type: 'success',
		title: `Dependant ${dependantId ? 'Updated' : 'Created'}`,
		description: `Dependant ${
			dependantId ? 'updated' : 'created'
		} successfully.`,
	})
}
