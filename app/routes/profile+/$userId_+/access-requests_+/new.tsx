import { LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { requireUser } from '~/utils/auth.server'
import { prisma } from '~/utils/db.server'
import { invariantResponse } from '~/utils/misc'
import { AccessRequestEditor } from './__access-request-editor'
export { action } from './__access-request-editor.server'

export async function loader({ request }: LoaderFunctionArgs) {
	const user = await requireUser(request)
	invariantResponse(user, 'Not Found', { status: 404 })

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

	return json({ requestor })
}
export default function AddAccessRequestRoute() {
	const { requestor } = useLoaderData<typeof loader>()
	return (
		<AccessRequestEditor
			title="Send Access Request"
			description="Please enter the access request details."
			intent="add"
			requestor={requestor}
		/>
	)
}
