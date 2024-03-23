import { Outlet } from '@remix-run/react'

export default function CountriesRoute() {
	return (
		<div className="flex flex-col gap-8">
			<Outlet />
		</div>
	)
}
