import { LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { requireUser } from '~/utils/auth.server'
import { prisma } from '~/utils/db.server'
import { invariantResponse } from '~/utils/misc'
import { AccessRequestEditor } from './__access-request-editor'
export { action } from './__access-request-editor.server'

export async function loader({ params, request }: LoaderFunctionArgs) {
	const user = await requireUser(request)

	const employee = await prisma.employee.findFirst({
		where: { email: user.email },
		select: {
			id: true,
			firstName: true,
			middleName: true,
			familyName: true,
			officeNumber: true,
			location: { select: { name: true } },
			floor: { select: { name: true } },
		},
	})

	invariantResponse(employee, 'Not Found', { status: 404 })

	const requestor = `${employee.firstName} ${employee.middleName} ${employee.familyName}, ${employee.location.name} ${employee.floor.name} ${employee.officeNumber}`

	const { accessRequestId } = params

	const accessRequest = await prisma.accessRequest.findUnique({
		where: { id: accessRequestId },
		include: {
			visitors: true,
		},
	})

	invariantResponse(accessRequest, 'Not Found', { status: 404 })

	return json({ accessRequest, requestor })
}

export default function DeleteAccessRequestRoute() {
	const { accessRequest, requestor } = useLoaderData<typeof loader>()

	return (
		<AccessRequestEditor
			accessRequest={accessRequest}
			requestor={requestor}
			title="Delete Access Request"
			description="Are you sure you want to delete this access request? This action is irreversible."
			intent="delete"
		/>
	)
}
