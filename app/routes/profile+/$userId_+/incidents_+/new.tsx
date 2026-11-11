import { LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { prisma } from '~/utils/db.server'
import { requireReporter } from './__incident-access.server'
import { IncidentEditor } from './__incident-editor'
export { action } from './__incident-editor.server'

export async function loader({ params, request }: LoaderFunctionArgs) {
	await requireReporter(request, params)
	const incidentTypes = await prisma.incidentType.findMany({
		orderBy: { name: 'asc' },
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
