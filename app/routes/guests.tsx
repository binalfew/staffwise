import { LoaderFunctionArgs, json } from '@remix-run/node'
import { requireUserId } from '~/utils/auth.server'

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserId(request)

	return json({})
}

export default function GuestsRoute() {
	return <div>My Guests</div>
}
