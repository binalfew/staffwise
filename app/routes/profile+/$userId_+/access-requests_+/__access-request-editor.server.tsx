import { parseWithZod } from '@conform-to/zod'
import { createId as cuid } from '@paralleldrive/cuid2'
import { ActionFunctionArgs, json } from '@remix-run/node'
import { requireUser } from '~/utils/auth.server'
import { validateCSRF } from '~/utils/csrf.server'
import { generateSerialNumber, prisma } from '~/utils/db.server'
import { checkHoneypot } from '~/utils/honeypot.server'
import { invariantResponse } from '~/utils/misc'
import { redirectWithToast } from '~/utils/toast.server'
import {
	AccessRequestDeleteSchema,
	AccessRequestEditorSchema,
	visitorHasId,
} from './__access-request-editor'

export async function action({ request }: ActionFunctionArgs) {
	const user = await requireUser(request)
	const formData = await request.formData()
	checkHoneypot(formData)
	await validateCSRF(formData, request.headers)
	const intent = formData.get('intent')

	if (intent === 'delete') {
		const submission = await parseWithZod(formData, {
			schema: AccessRequestDeleteSchema,
			async: true,
		})

		if (submission.status !== 'success') {
			return json(
				{ result: submission.reply() },
				{ status: submission.status === 'error' ? 400 : 200 },
			)
		}
		await prisma.accessRequest.delete({
			where: { id: submission.value.id },
		})

		return redirectWithToast(`/profile/${user.id}/access-requests`, {
			type: 'success',
			title: `Access Request Deleted`,
			description: `Access Request deleted successfully.`,
		})
	}

	const submission = await parseWithZod(formData, {
		schema: AccessRequestEditorSchema.transform(
			async ({ visitors = [], ...data }) => {
				return {
					...data,
					updatedVisitors: visitors.filter(visitorHasId),
					newVisitors: visitors.filter(visitor => !visitor.id),
				}
			},
		),
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

	const {
		id: accessRequestId,
		updatedVisitors,
		newVisitors,
		requestor,
		...accessRequestDetails
	} = submission.value

	const requestNumber = await generateSerialNumber('ACCESSREQUEST')
	const data = {
		...accessRequestDetails,
		requestorId: employee.id,
		requestNumber,
	}

	await prisma.accessRequest.upsert({
		select: { id: true },
		where: { id: accessRequestId ?? '__new_access_request__' },
		create: {
			...data,
			visitors: {
				create: newVisitors,
			},
		},
		update: {
			...data,
			visitors: {
				deleteMany: {
					id: { notIn: updatedVisitors.map(visitor => visitor.id) },
				},
				updateMany: updatedVisitors.map(visitor => ({
					where: { id: visitor.id },
					data: {
						...visitor,
						id: visitor.firstName ? cuid() : visitor.id,
					},
				})),
				create: newVisitors,
			},
		},
	})

	return redirectWithToast(`/profile/${user.id}/access-requests`, {
		type: 'success',
		title: `Access Request ${accessRequestId ? 'Updated' : 'Created'}`,
		description: `Access Request ${
			accessRequestId ? 'updated' : 'created'
		} successfully.`,
	})
}
