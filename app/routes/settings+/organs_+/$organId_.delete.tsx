import { LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { prisma } from '~/utils/db.server'
import { invariantResponse } from '~/utils/misc'
import { OrganEditor } from './__organ-editor'
export { action } from './__organ-editor.server'

export async function loader({ params }: LoaderFunctionArgs) {
	const { organId } = params

	const organ = await prisma.organ.findUnique({
		where: { id: organId },
	})

	const countries = await prisma.country.findMany({
		select: { id: true, name: true },
	})

	invariantResponse(organ, 'Not Found', { status: 404 })

	return json({ organ, countries })
}

export default function DeleteOrganRoute() {
	const { organ, countries } = useLoaderData<typeof loader>()
	return (
		<OrganEditor
			organ={organ}
			countries={countries}
			title="Delete Organ"
			intent="delete"
		/>
	)
}
