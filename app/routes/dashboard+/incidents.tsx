import { LoaderFunctionArgs, json } from '@remix-run/node'
import { Outlet } from '@remix-run/react'
import {
	ErrorDisplay,
	GeneralErrorBoundary,
} from '~/components/ui/error-boundary'
import { requireUserWithRoles } from '~/utils/permission.server'

export async function loader({ params, request }: LoaderFunctionArgs) {
	await requireUserWithRoles(request, ['admin', 'incidentAdmin'])
	return json({})
}

export default function IncidentsRoute() {
	return <Outlet />
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				403: () => (
					<ErrorDisplay
						title="Access Denied"
						message="You don't have permission to view incidents."
						redirectUrl="/dashboard"
					/>
				),
			}}
		/>
	)
}
