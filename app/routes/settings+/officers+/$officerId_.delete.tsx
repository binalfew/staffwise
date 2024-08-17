import { LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { prisma } from '~/utils/db.server.ts'
import { invariantResponse } from '~/utils/misc.tsx'
import { OfficerEditor } from './__officer-editor'
export { action } from './__officer-editor.server'

export async function loader({ params }: LoaderFunctionArgs) {
	const { officerId } = params

	const officer = await prisma.officer.findUnique({
		where: { id: officerId },
		include: {
			employee: true,
		},
	})

	invariantResponse(officer, 'Not Found', { status: 404 })

	return json({ officer })
}

export default function DeleteOfficerRoute() {
	const { officer } = useLoaderData<typeof loader>()
	return (
		<OfficerEditor officer={officer} title="Delete Officer" intent="delete" />
	)
}
