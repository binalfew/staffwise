import { LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { requireUser } from '~/utils/auth.server'
import { prisma } from '~/utils/db.server'
import {
	formatBuilding,
	formatFloor,
	formatFullName,
	invariantResponse,
} from '~/utils/misc'
import { AccessRequestEditor } from './__access-request-editor'
export { action } from './__access-request-editor.server'

export async function loader({ request }: LoaderFunctionArgs) {
	const user = await requireUser(request)
	invariantResponse(user, 'Not Found', { status: 404 })

	const employee = await prisma.employee.findFirst({
		where: {
			email: {
				equals: user.email,
				mode: 'insensitive',
			},
		},
		select: {
			id: true,
			firstName: true,
			middleName: true,
			familyName: true,
			officeNumber: true,
			location: { select: { name: true } },
			buildingName: true,
			floor: { select: { name: true } },
			floorName: true,
		},
	})

	invariantResponse(employee, 'Not Found', { status: 404 })
	const place = [
		formatBuilding(employee),
		formatFloor(employee),
		employee.officeNumber,
	]
		.filter(Boolean)
		.join(' ')
	const requestor = `${formatFullName(employee)}, ${place}`

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
