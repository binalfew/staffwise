import { LoaderFunctionArgs, json } from '@remix-run/node'
import { ConstructionIcon } from 'lucide-react'
import { requireUserId } from '~/utils/auth.server'

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserId(request)

	return json({})
}

export default function ParkingRoute() {
	return (
		<div className="flex flex-col items-center justify-center">
			<div className="text-6xl text-blue-500 mb-4">
				<ConstructionIcon className="w-16 h-16" />
			</div>
			<h1 className="text-3xl font-bold mb-2">Parking Reservation</h1>
			<p className="text-xl text-gray-600 mb-4">
				This feature is under development
			</p>
			<div className="w-64 h-4 bg-gray-200 rounded-full">
				<div className="w-1/3 h-full bg-blue-500 rounded-full animate-pulse"></div>
			</div>
			<p className="mt-4 text-sm text-gray-500">Check back soon for updates!</p>
		</div>
	)
}
