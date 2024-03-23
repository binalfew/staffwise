import { NavLink, Outlet, json, useLoaderData } from '@remix-run/react'
import clsx from 'clsx'
import { settingsNavigation } from '~/utils/constants'

export async function loader() {
	return json({ navigation: settingsNavigation })
}

export default function SettingsRoute() {
	const { navigation } = useLoaderData<typeof loader>()
	return (
		<>
			<div className="mx-auto grid w-full max-w-full gap-2 border-b">
				<h1 className="text-3xl font-semibold py-2">Settings</h1>
			</div>
			<div className="mx-auto grid w-full max-w-full items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]">
				<nav className="grid gap-4 text-sm text-muted-foreground">
					{navigation.map(item => {
						return (
							<NavLink
								key={item.name}
								to={item.href}
								className={({ isActive }) =>
									clsx(isActive ? 'font-semibold text-primary' : '')
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
		</>
	)
}
