import { LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { prisma } from '~/utils/db.server'
import { invariantResponse } from '~/utils/misc'
import { AccessRequestEditor } from './__access-request-editor'
export { action } from './__access-request-editor.server'

export async function loader({ params }: LoaderFunctionArgs) {
	const { accessRequestId } = params

	const accessRequest = await prisma.accessRequest.findUnique({
		where: { id: accessRequestId },
		include: {
			visitors: true,
		},
	})

	invariantResponse(accessRequest, 'Not Found', { status: 404 })

	return json({ accessRequest })
}

export default function EditSpouseRoute() {
	const { accessRequest } = useLoaderData<typeof loader>()
	return (
		<AccessRequestEditor
			accessRequest={accessRequest}
			title="Edit Access Request"
			description="Edit the access request details."
			intent="edit"
		/>
	)
}
