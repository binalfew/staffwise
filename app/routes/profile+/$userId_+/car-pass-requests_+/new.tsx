import { LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { requireUser } from '~/utils/auth.server'
import { prisma } from '~/utils/db.server'
import { invariantResponse } from '~/utils/misc'
import { CarPassRequestEditor } from './__car-pass-request-editor'
export { action } from './__car-pass-request-editor.server'

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
			vehicles: {
				select: {
					id: true,
					plateNumber: true,
					make: true,
					model: true,
					year: true,
					color: true,
					capacity: true,
					ownership: true,
				},
			},
		},
	})

	invariantResponse(employee, 'Not Found', { status: 404 })

	return json({
		vehicles: employee.vehicles,
	})
}

export default function AddCarPassRequestRoute() {
	const { vehicles } = useLoaderData<typeof loader>()
	return (
		<CarPassRequestEditor
			title="Send Car Pass Request"
			description="Please enter the car pass request details."
			intent="add"
			vehicles={vehicles}
		/>
	)
}
