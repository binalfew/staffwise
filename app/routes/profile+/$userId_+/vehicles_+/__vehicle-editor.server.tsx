import { parseWithZod } from '@conform-to/zod'
import { ActionFunctionArgs, json } from '@remix-run/node'
import { insertAuditLog } from '~/utils/audit.server'
import { requireUser } from '~/utils/auth.server'
import { validateCSRF } from '~/utils/csrf.server'
import { prisma } from '~/utils/db.server'
import { checkHoneypot } from '~/utils/honeypot.server'
import { invariantResponse } from '~/utils/misc'
import { redirectWithToast } from '~/utils/toast.server'
import { VehicleDeleteSchema, VehicleEditorSchema } from './__vehicle-editor'

export async function action({ params, request }: ActionFunctionArgs) {
	const user = await requireUser(request)
	const formData = await request.formData()
	checkHoneypot(formData)
	await validateCSRF(formData, request.headers)

	const intent = formData.get('intent')

	if (intent === 'delete') {
		const submission = await parseWithZod(formData, {
			schema: VehicleDeleteSchema,
			async: true,
		})
		if (submission.status !== 'success') {
			return json(
				{ result: submission.reply() },
				{ status: submission.status === 'error' ? 400 : 200 },
			)
		}
		await prisma.vehicle.delete({
			where: { id: submission.value.id },
		})

		return redirectWithToast(`/profile/${user.id}/vehicles`, {
			type: 'success',
			title: `Vehicle Deleted`,
			description: `Vehicle entry deleted successfully.`,
		})
	}

	const submission = await parseWithZod(formData, {
		schema: VehicleEditorSchema,
		async: true, // Make sure this is async if your validation logic requires it
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

	const { id: vehicleId, ...vehicleDetails } = submission.value

	const data = {
		employeeId: employee.id,
		...vehicleDetails,
	}

	await prisma.vehicle.upsert({
		where: { id: vehicleId ?? '__new_vehicle__' },
		create: data,
		update: data,
	})

	await insertAuditLog({
		user: { id: user.id },
		action: vehicleId ? 'UPDATE' : 'CREATE',
		entity: 'Vehicle',
		details: {
			...data,
			id: vehicleId,
		},
	})

	return redirectWithToast(`/profile/${user.id}/vehicles`, {
		type: 'success',
		title: `Vehicle ${vehicleId ? 'Updated' : 'Created'}`,
		description: `Vehicle ${vehicleId ? 'updated' : 'created'} successfully.`,
	})
}
