import { LoaderFunctionArgs, json } from '@remix-run/node'
import { Outlet } from '@remix-run/react'
import {
	ErrorDisplay,
	GeneralErrorBoundary,
} from '~/components/ui/error-boundary'
import { requireUserWithRoles } from '~/utils/permission.server'

export async function loader({ request, params }: LoaderFunctionArgs) {
	await requireUserWithRoles(request, ['admin', 'accessRequestAdmin'])

	return json({})
}

export default function AccessRequestsRoute() {
	return <Outlet />
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				403: () => (
					<ErrorDisplay
						title="Access Denied"
						message="You don't have permission to view access requests."
						redirectUrl="/dashboard"
					/>
				),
			}}
		/>
	)
}
