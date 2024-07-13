import { ActionFunctionArgs, redirect } from '@remix-run/node'
import { authenticator } from '~/utils/auth.server'
import { ProviderNameSchema } from '~/utils/connections'

export async function loader() {
	return redirect('/login')
}

export async function action({ request, params }: ActionFunctionArgs) {
	const providerName = ProviderNameSchema.parse(params.provider)

	return await authenticator.authenticate(providerName, request)
}
