import { EyeOpenIcon } from '@radix-ui/react-icons'
import { LoaderFunctionArgs, json } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { ArrowLeftIcon } from 'lucide-react'
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
import { formatDate } from '~/utils/misc'
import { requireUserWithRoles } from '~/utils/permission.server'

export async function loader({ request, params }: LoaderFunctionArgs) {
	await requireUserWithRoles(request, ['admin', 'accessRequestAdmin'])

	const { data, totalPages, currentPage } = await filterAndPaginate({
		request,
		model: prisma.accessRequest,
		searchFields: [
			'requestNumber',
			'requestor.firstName',
			'requestor.middleName',
			'requestor.familyName',
			'requestor.email',
		],
		orderBy: [{ requestNumber: 'desc' }],
		select: {
			id: true,
			requestNumber: true,
			requestor: {
				select: {
					firstName: true,
					middleName: true,
				},
			},
			_count: {
				select: {
					visitors: true,
				},
			},
			startDate: true,
			endDate: true,
			createdAt: true,
		},
	})

	return json({
		status: 'idle',
		accessRequests: data,
		totalPages,
		currentPage,
	} as const)
}

export default function AccessRequestsRoute() {
	const data = useLoaderData<typeof loader>()
	console.log(data)
	const { totalPages, currentPage } = data

	return (
		<div className="flex flex-col gap-8">
			<Card className="w-full">
				<CardHeader className="flex flex-row items-center">
					<div className="grid gap-2">
						<CardTitle className="text-base font-semibold leading-6 text-gray-900">
							Access Requests
						</CardTitle>
					</div>
					<div className="flex items-center gap-2 ml-auto">
						<SearchBar
							status={data.status}
							action={`/dashboard/access-requests`}
							autoSubmit
						/>

						<Button asChild size="sm" className="ml-auto gap-1">
							<Link to={`/dashboard`}>
								<ArrowLeftIcon className="h-4 w-4" />
								Back
							</Link>
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					<div className="overflow-x-auto rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Request Number</TableHead>
									<TableHead>Requestor</TableHead>
									<TableHead>Date Requested</TableHead>
									<TableHead>Start Date</TableHead>
									<TableHead>End Date</TableHead>
									<TableHead className="w-1/6 text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.status === 'idle' ? (
									data.accessRequests.length > 0 ? (
										data.accessRequests.map((accessRequest: any) => (
											<TableRow key={accessRequest.id}>
												<TableCell className="py-1">
													{accessRequest.requestNumber}
												</TableCell>
												<TableCell className="py-1">
													{accessRequest.requestor.firstName}{' '}
													{accessRequest.requestor.middleName}
												</TableCell>
												<TableCell className="py-1">
													{formatDate(accessRequest.createdAt)}
												</TableCell>
												<TableCell className="py-1">
													{formatDate(accessRequest.startDate)}
												</TableCell>
												<TableCell className="py-1">
													{formatDate(accessRequest.endDate)}
												</TableCell>
												<TableCell className="py-1 text-right space-x-1">
													<Button asChild size="xs" className="gap-1">
														<Link to={`${accessRequest.id}`}>
															<span>{accessRequest._count.visitors}</span>
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
													No guests found
												</h3>
											</TableCell>
										</TableRow>
									)
								) : data.status === 'error' ? (
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
