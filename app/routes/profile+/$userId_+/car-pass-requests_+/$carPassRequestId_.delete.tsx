import { LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { requireUser } from '~/utils/auth.server'
import { prisma } from '~/utils/db.server'
import { invariantResponse } from '~/utils/misc'
import { CarPassRequestEditor } from './__car-pass-request-editor'
export { action } from './__car-pass-request-editor.server'

export async function loader({ params, request }: LoaderFunctionArgs) {
	const user = await requireUser(request)

	const employee = await prisma.employee.findFirst({
		where: {
			email: {
				equals: user.email,
				mode: 'insensitive',
			},
		},
		select: {
			vehicles: {
				select: {
					id: true,
					plateNumber: true,
					color: true,
					capacity: true,
					ownership: true,
					make: true,
					model: true,
					year: true,
				},
			},
		},
	})

	invariantResponse(employee, 'Not Found', { status: 404 })

	const { carPassRequestId } = params
	const carPassRequest = await prisma.carPassRequest.findUnique({
		where: { id: carPassRequestId },
		include: {
			employeeCarPassRequest: { select: { vehicleId: true } },
			attachments: true,
		},
	})

	invariantResponse(carPassRequest, 'Not Found', { status: 404 })

	return json({
		carPassRequest,
		vehicles: employee.vehicles,
	})
}

export default function DeleteCarPassRequestRoute() {
	const { carPassRequest, vehicles } = useLoaderData<typeof loader>()
	return (
		<CarPassRequestEditor
			carPassRequest={carPassRequest}
			vehicles={vehicles}
			title="Delete Car Pass Request"
			description="Delete the car pass request."
			intent="delete"
		/>
	)
}
