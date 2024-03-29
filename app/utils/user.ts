import { useRouteLoaderData } from '@remix-run/react'
import { type loader as rootLoader } from '~/root'

export function useOptionalUser() {
	const data = useRouteLoaderData<typeof rootLoader>('root')
	return data?.user ?? null
}

export function useUser() {
	const user = useOptionalUser()
	if (!user)
		throw new Error(
			'User not found. If the user is optional, use useOptionalUser instead.',
		)

	return user
}
