import { LoaderFunctionArgs, json } from '@remix-run/node'
import { Outlet } from '@remix-run/react'
import { requireUserWithRole } from '~/utils/permission.server'

export async function loader({ request, params }: LoaderFunctionArgs) {
	await requireUserWithRole(request, 'admin')

	return json({})
}

export default function AccessRequestsRoute() {
	return <Outlet />
}
