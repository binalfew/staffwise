import { LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { requireUserId } from '~/utils/auth.server'
import { prisma } from '~/utils/db.server'
import { IncidentEditor } from './__incident-editor'
export { action } from './__incident-editor.server'

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserId(request)
	const incidentTypes = await prisma.incidentType.findMany({
		select: { id: true, name: true },
	})
	return json({
		incidentTypes,
	})
}

export default function AddIncidentRoute() {
	const { incidentTypes } = useLoaderData<typeof loader>()
	return (
		<IncidentEditor
			incidentTypes={incidentTypes}
			title="Add Incident"
			description="Add a new incident"
			intent="add"
		/>
	)
}
