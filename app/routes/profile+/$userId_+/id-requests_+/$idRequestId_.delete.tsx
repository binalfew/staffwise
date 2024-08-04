import { LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { requireUser } from '~/utils/auth.server'
import { prisma } from '~/utils/db.server'
import { invariantResponse } from '~/utils/misc'
import { IdRequestEditor } from './__id-request-editor'
export { action } from './__id-request-editor.server'

export async function loader({ params, request }: LoaderFunctionArgs) {
	const user = await requireUser(request)

	const employee = await prisma.employee.findFirst({
		where: { email: user.email },
		select: {
			spouses: {
				select: {
					id: true,
					firstName: true,
					middleName: true,
					familyName: true,
				},
			},
			dependants: {
				select: {
					id: true,
					firstName: true,
					middleName: true,
					familyName: true,
				},
			},
		},
	})

	invariantResponse(employee, 'Not Found', { status: 404 })

	const { idRequestId } = params
	const idRequest = await prisma.idRequest.findUnique({
		where: { id: idRequestId },
		include: {
			employeeIdRequest: { select: { contractExpireDate: true } },
			spouseIdRequest: { select: { spouseId: true } },
			dependantIdRequest: { select: { dependantId: true } },
			privateDriverIdRequest: {
				select: {
					staffAuIdNumber: true,
					driverFullName: true,
					driverIdNumber: true,
					title: true,
					driverPhoneNumber: true,
					gender: true,
					nationality: true,
				},
			},
			attachments: true,
		},
	})

	invariantResponse(idRequest, 'Not Found', { status: 404 })

	return json({
		idRequest,
		spouses: employee.spouses,
		dependants: employee.dependants,
	})
}

export default function DeleteIdRequestRoute() {
	const { idRequest, spouses, dependants } = useLoaderData<typeof loader>()
	return (
		<IdRequestEditor
			idRequest={idRequest}
			spouses={spouses}
			dependants={dependants}
			title="Delete ID Request"
			description="Delete the ID request."
			intent="delete"
		/>
	)
}
