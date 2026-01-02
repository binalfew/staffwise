import { LoaderFunctionArgs } from '@remix-run/node'
import { Link, Outlet, json, useLoaderData } from '@remix-run/react'
import {
	ActivityIcon,
	CreditCardIcon,
	DollarSignIcon,
	UsersIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { GeneralErrorBoundary } from '~/components/ui/error-boundary'
import { prisma } from '~/utils/db.server'
import { requireUserWithRoles } from '~/utils/permission.server'
import { useOptionalUser, userHasRoles } from '~/utils/user'

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserWithRoles(request, [
		'admin',
		'phpAdmin',
		'accessRequestAdmin',
		'incidentAdmin',
		'idRequestAdmin',
		'carPassAdmin',
	])
	const phpCount = await prisma.employee.count()
	const incidentsCount = await prisma.incident.count()
	const idRequestsCount = await prisma.idRequest.count()
	const carPassRequestsCount = await prisma.carPassRequest.count()
	const accessRequestsCount = await prisma.accessRequest.count()

	return json({
		phpCount,
		incidentsCount,
		idRequestsCount,
		carPassRequestsCount,
		accessRequestsCount,
	})
}

export default function DashboardRoute() {
	const {
		phpCount,
		incidentsCount,
		idRequestsCount,
		carPassRequestsCount,
		accessRequestsCount,
	} = useLoaderData<typeof loader>()

	const user = useOptionalUser()

	return (
		<div className="grid gap-6">
			<div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-5">
				{[
					{
						title: 'PHP',
						icon: DollarSignIcon,
						count: phpCount,
						link: 'php',
						color: 'bg-blue-100 text-blue-800',
						roles: ['admin', 'phpAdmin'],
					},
					{
						title: 'Incidents',
						icon: UsersIcon,
						count: incidentsCount,
						link: 'incidents',
						color: 'bg-green-100 text-green-800',
						roles: ['admin', 'incidentAdmin'],
					},
					{
						title: 'ID Requests',
						icon: CreditCardIcon,
						count: idRequestsCount,
						link: 'id-requests',
						color: 'bg-yellow-100 text-yellow-800',
						roles: ['admin', 'idRequestAdmin'],
					},
					{
						title: 'Car Pass Requests',
						icon: ActivityIcon,
						count: carPassRequestsCount,
						link: 'car-pass-requests',
						color: 'bg-red-100 text-red-800',
						roles: ['admin', 'carPassAdmin'],
					},
					{
						title: 'Access Requests',
						icon: ActivityIcon,
						count: accessRequestsCount,
						link: 'access-requests',
						color: 'bg-purple-100 text-purple-800',
						roles: ['admin', 'accessRequestAdmin'],
					},
				].map(
					(item, idx) =>
						userHasRoles(user, item.roles) && (
							<Link key={idx} to={`/dashboard/${item.link}`}>
								<Card className={`border ${item.color}`}>
									<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
										<CardTitle className="text-sm font-medium">
											{item.title}
										</CardTitle>
										<item.icon className="h-4 w-4 text-muted-foreground" />
									</CardHeader>
									<CardContent>
										<div className="text-2xl font-bold">{item.count}</div>
										<p className="text-xs text-muted-foreground"></p>
									</CardContent>
								</Card>
							</Link>
						),
				)}
			</div>

			<Outlet />
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
