import { EyeOpenIcon } from '@radix-ui/react-icons'
import { json, LoaderFunctionArgs } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { formatDistance } from 'date-fns'
import { ArrowLeftIcon, DownloadIcon } from 'lucide-react'
import { ErrorList } from '~/components/ErrorList'
import { Paginator } from '~/components/Paginator'
import { SearchBar } from '~/components/SearchBar'
import { Button } from '~/components/ui/button'
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from '~/components/ui/card'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '~/components/ui/table'
import { filterAndPaginate, prisma } from '~/utils/db.server'
import { getEmployeesFileSrc } from '~/utils/misc'
import { requireUserWithRoles } from '~/utils/permission.server'

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserWithRoles(request, ['admin', 'phpAdmin'])

	// Get recent pending updates (last 10 days)
	const tenDaysAgo = new Date()
	tenDaysAgo.setDate(tenDaysAgo.getDate() - 10)

	const recentPendingUpdates = await prisma.employee.findMany({
		where: {
			profileStatus: 'PENDING',
			updatedAt: {
				gte: tenDaysAgo,
			},
		},
		select: {
			id: true,
			firstName: true,
			familyName: true,
			auIdNumber: true,
			updatedAt: true,
		},
		orderBy: {
			updatedAt: 'desc',
		},
	})

	const { data, totalPages, currentPage } = await filterAndPaginate({
		request,
		model: prisma.employee,
		searchFields: ['auIdNumber', 'firstName', 'middleName'],
		orderBy: [{ firstName: 'asc' }],
		select: {
			id: true,
			firstName: true,
			middleName: true,
			familyName: true,
			auIdNumber: true,
			updatedAt: true,
			profileStatus: true,
		},
	})

	return json({
		status: 'idle',
		employees: data,
		recentPendingUpdates,
		totalPages,
		currentPage,
	} as const)
}

export default function PhpRoute() {
	const data = useLoaderData<typeof loader>()
	const { employees, recentPendingUpdates, totalPages, currentPage, status } =
		data

	return (
		<div className="flex flex-col gap-8">
			{recentPendingUpdates.length > 0 && (
				<Card className="w-full">
					<CardHeader>
						<CardTitle className="text-base font-semibold leading-6 text-gray-900">
							Pending Approvals
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="overflow-x-auto rounded-md border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>ID</TableHead>
										<TableHead>Name</TableHead>
										<TableHead>Updated</TableHead>
										<TableHead className="w-1/6 text-right pr-6">
											Actions
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{recentPendingUpdates.map(employee => (
										<TableRow key={employee.id}>
											<TableCell className="py-1">
												{employee.auIdNumber}
											</TableCell>
											<TableCell className="py-1">
												{employee.firstName} {employee.familyName}
											</TableCell>
											<TableCell className="py-1">
												{formatDistance(
													new Date(employee.updatedAt),
													new Date(),
													{ addSuffix: true },
												)}
											</TableCell>
											<TableCell className="py-1 text-right space-x-1">
												<Button asChild size="xs">
													<Link to={`${employee.id}`}>
														<EyeOpenIcon className="h-4 w-4" />
													</Link>
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					</CardContent>
				</Card>
			)}

			<Card className="w-full">
				<CardHeader className="flex flex-row items-center">
					<div className="grid gap-2">
						<CardTitle className="text-base font-semibold leading-6 text-gray-900">
							PHP
						</CardTitle>
					</div>
					<div className="flex items-center gap-2 ml-auto">
						<SearchBar status={status} action={`/dashboard/php`} autoSubmit />

						<Button asChild size="sm" className="ml-auto gap-1">
							<Link to={`/dashboard`}>
								<ArrowLeftIcon className="h-4 w-4" />
								Back
							</Link>
						</Button>

						<Button asChild size="sm" className="ml-auto gap-1">
							<a href={getEmployeesFileSrc()}>
								<DownloadIcon className="h-4 w-4" />
								Export
							</a>
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					<div className="overflow-x-auto rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>ID</TableHead>
									<TableHead>First Name</TableHead>
									<TableHead>Middle Name</TableHead>
									<TableHead>Family Name</TableHead>
									<TableHead className="w-1/6 text-right pr-6">
										Actions
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{status === 'idle' ? (
									employees.length > 0 ? (
										employees.map((employee: any) => (
											<TableRow key={employee.id}>
												<TableCell className="py-1">
													{employee.auIdNumber}
												</TableCell>
												<TableCell className="py-1">
													{employee.firstName}
												</TableCell>
												<TableCell className="py-1">
													{employee.middleName}
												</TableCell>
												<TableCell className="py-1">
													{employee.familyName}
												</TableCell>
												<TableCell className="py-1 text-right space-x-1">
													<Button asChild size="xs">
														<Link to={`${employee.id}`}>
															<EyeOpenIcon className="h-4 w-4" />
														</Link>
													</Button>
												</TableCell>
											</TableRow>
										))
									) : (
										<TableRow>
											<TableCell colSpan={5} className="text-center">
												<h3 className="mt-2 text-sm font-semibold text-muted-foreground">
													No employees found
												</h3>
											</TableCell>
										</TableRow>
									)
								) : status === 'error' ? (
									<TableRow>
										<TableCell colSpan={4} className="text-center">
											<ErrorList
												errors={['There was an error parsing the results']}
											/>
										</TableCell>
									</TableRow>
								) : (
									<TableRow>
										<TableCell colSpan={4} className="text-center">
											Loading...
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
				</CardContent>
				{totalPages > 0 ? (
					<CardFooter className="border-t px-6 py-4">
						<Paginator totalPages={totalPages} currentPage={currentPage} />
					</CardFooter>
				) : null}
			</Card>
		</div>
	)
}
