import { json, LoaderFunctionArgs } from '@remix-run/node'
import { isRouteErrorResponse, Outlet, useRouteError } from '@remix-run/react'
import {
	ErrorDisplay,
	GeneralErrorBoundary,
} from '~/components/ui/error-boundary'
import { requireUserWithRoles } from '~/utils/permission.server'

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserWithRoles(request, ['admin', 'phpAdmin'])

	return json({})
}

export default function PhpRoute() {
	return <Outlet />
}

export function ErrorBoundary() {
	const error = useRouteError()

	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: () => (
					<ErrorDisplay
						title="Not Found"
						message={
							isRouteErrorResponse(error)
								? error.data
								: 'The resource you are looking for does not exist.'
						}
						redirectUrl="/dashboard/php"
					/>
				),
				403: () => (
					<ErrorDisplay
						title="Access Denied"
						message="You don't have permission to view php."
						redirectUrl="/dashboard"
					/>
				),
			}}
		/>
	)
}
