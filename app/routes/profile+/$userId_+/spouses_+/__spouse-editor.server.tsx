import { parseWithZod } from '@conform-to/zod'
import { ActionFunctionArgs, json } from '@remix-run/node'
import { requireUser } from '~/utils/auth.server'
import { validateCSRF } from '~/utils/csrf.server'
import { prisma } from '~/utils/db.server'
import { checkHoneypot } from '~/utils/honeypot.server'
import { invariantResponse } from '~/utils/misc'
import { redirectWithToast } from '~/utils/toast.server'
import { SpouseDeleteSchema, SpouseEditorSchema } from './__spouse-editor'

export async function action({ params, request }: ActionFunctionArgs) {
	const user = await requireUser(request)
	const formData = await request.formData()
	checkHoneypot(formData)
	await validateCSRF(formData, request.headers)

	const intent = formData.get('intent')

	if (intent === 'delete') {
		const submission = await parseWithZod(formData, {
			schema: SpouseDeleteSchema,
			async: true,
		})
		if (submission.status !== 'success') {
			return json(
				{ result: submission.reply() },
				{ status: submission.status === 'error' ? 400 : 200 },
			)
		}
		await prisma.spouse.delete({
			where: { id: submission.value.id },
		})

		return redirectWithToast(`/profile/${user.id}/spouses`, {
			type: 'success',
			title: `Spouse Deleted`,
			description: `Spouse entry deleted successfully.`,
		})
	}

	const submission = await parseWithZod(formData, {
		schema: SpouseEditorSchema,
		async: true,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const employee = await prisma.employee.findFirst({
		where: { email: user.email },
		select: { id: true },
	})

	invariantResponse(employee, 'Employee not found', {
		status: 404,
	})

	const { id: spouseId, ...spouseDetails } = submission.value

	const data = {
		employeeId: employee.id,
		...spouseDetails,
	}

	await prisma.spouse.upsert({
		where: { id: spouseId ?? '__new_spouse__' },
		create: data,
		update: data,
	})

	return redirectWithToast(`/profile/${user.id}/spouses`, {
		type: 'success',
		title: `Spouse ${spouseId ? 'Updated' : 'Created'}`,
		description: `Spouse ${spouseId ? 'updated' : 'created'} successfully.`,
	})
}
