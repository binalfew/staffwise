import { LoaderFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/react'
import {
	ErrorDisplay,
	GeneralErrorBoundary,
} from '~/components/ui/error-boundary'
import { requireUserWithRoles } from '~/utils/permission.server'

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserWithRoles(request, ['admin', 'phpAdmin'])

	return json({})
}

export default function IndexRoute() {
	return <></>
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				403: () => (
					<ErrorDisplay
						title="Access Denied"
						message="You don't have permission to view the dashboard."
					/>
				),
			}}
		/>
	)
}
