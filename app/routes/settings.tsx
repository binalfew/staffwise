import { LoaderFunctionArgs } from '@remix-run/node'
import { NavLink, Outlet, json, useLoaderData } from '@remix-run/react'
import clsx from 'clsx'
import { GeneralErrorBoundary } from '~/components/ui/error-boundary'
import { settingsNavigation } from '~/utils/constants'
import { requireUserWithRole } from '~/utils/permission.server'

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserWithRole(request, 'admin')
	return json({ navigation: settingsNavigation })
}

export default function SettingsRoute() {
	const { navigation } = useLoaderData<typeof loader>()
	return (
		<div className="mx-auto grid w-full max-w-full items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]">
			<nav className="grid gap-2 text-sm p-4 border border-border rounded-lg">
				{navigation.map(item => {
					return (
						<NavLink
							key={item.name}
							to={item.href}
							className={({ isActive }) =>
								clsx(
									'rounded-md px-3 py-2 transition-colors',
									isActive
										? 'bg-primary text-primary-foreground font-semibold'
										: 'text-muted-foreground hover:bg-muted hover:text-foreground',
								)
							}
						>
							{item.name}
						</NavLink>
					)
				})}
			</nav>
			<div className="grid gap-6">
				<Outlet />
			</div>
		</div>
	)
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
