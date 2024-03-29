import { LoaderFunctionArgs, json } from '@remix-run/node'
import { Outlet } from '@remix-run/react'
import { requireUserId } from '~/utils/auth.server'

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserId(request)

	return json({})
}

export default function RelationshipsRoute() {
	return <Outlet />
}
