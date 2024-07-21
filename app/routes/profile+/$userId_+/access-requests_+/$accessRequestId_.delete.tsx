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

export default function DeleteAccessRequestRoute() {
	const { accessRequest } = useLoaderData<typeof loader>()
	return (
		<AccessRequestEditor
			accessRequest={accessRequest}
			title="Delete Access Request"
			description="Are you sure you want to delete this access request? This action is irreversible."
			intent="delete"
		/>
	)
}
