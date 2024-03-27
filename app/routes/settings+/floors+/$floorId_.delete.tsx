import { LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { prisma } from '~/utils/db.server'
import { invariantResponse } from '~/utils/misc'
import { FloorEditor } from './__floor-editor'
export { action } from './__floor-editor.server'

export async function loader({ params }: LoaderFunctionArgs) {
	const { floorId } = params

	const floor = await prisma.floor.findUnique({
		where: { id: floorId },
	})

	invariantResponse(floor, 'Not Found', { status: 404 })

	return json({ floor })
}

export default function DeleteFloorRoute() {
	const { floor } = useLoaderData<typeof loader>()
	return <FloorEditor floor={floor} title="Delete Floor" intent="delete" />
}
