import { LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { prisma } from '~/utils/db.server'
import { invariantResponse } from '~/utils/misc'
import { VehicleEditor } from './__vehicle-editor'
export { action } from './__vehicle-editor.server'

export async function loader({ params }: LoaderFunctionArgs) {
	const { vehicleId } = params

	const vehicle = await prisma.vehicle.findUnique({
		where: { id: vehicleId },
	})

	invariantResponse(vehicle, 'Not Found', { status: 404 })

	return json({ vehicle })
}

export default function DeleteVehicleRoute() {
	const { vehicle } = useLoaderData<typeof loader>()
	return (
		<VehicleEditor vehicle={vehicle} title="Delete Vehicle" intent="delete" />
	)
}
