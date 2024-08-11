import { LoaderFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/react'
import { GeneralErrorBoundary } from '~/components/ui/error-boundary'
import { requireUserWithRole } from '~/utils/permission.server'

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserWithRole(request, 'admin')

	return json({})
}

export default function IndexRoute() {
	return <></>
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				403: () => <p>You are not allowed to do that</p>,
			}}
		/>
	)
}
