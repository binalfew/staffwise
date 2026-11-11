import { LoaderFunctionArgs, json } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { EyeOpenIcon } from '@radix-ui/react-icons'
import {
	ArrowLeftIcon,
	EditIcon,
	LockIcon,
	PlusCircle,
	TrashIcon,
} from 'lucide-react'
import { ErrorList } from '~/components/ErrorList'
import { IncidentStatusBadge } from '~/components/IncidentStatusBadge'
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
import { requireUser } from '~/utils/auth.server'
import { filterAndPaginate, prisma } from '~/utils/db.server'
import { formatDate, formatTime, invariantResponse } from '~/utils/misc'

export async function loader({ params, request }: LoaderFunctionArgs) {
	const user = await requireUser(request)
	invariantResponse(user.id === params.userId, 'Not authorized', {
		status: 403,
	})

	const employee = await prisma.employee.findFirst({
		where: {
			email: {
				equals: user.email,
				mode: 'insensitive',
			},
		},
	})

	invariantResponse(employee, 'Employee not found', {
		status: 404,
	})

	const { data, totalPages, currentPage } = await filterAndPaginate({
		request,
		model: prisma.incident,
		searchFields: ['incidentNumber'],
		where: {
			employeeId: employee.id,
		},
		orderBy: [{ createdAt: 'desc' }],
		select: {
			id: true,
			incidentNumber: true,
			status: true,
			incidentType: { select: { name: true } },
			severity: true,
			location: true,
			occuredAt: true,
			timeOfDay: true,
			occuredWhile: true,
		},
	})

	return json({
		user,
		status: 'idle',
		incidents: data,
		totalPages,
		currentPage,
	} as const)
}

export default function IncidentsRoute() {
	const data = useLoaderData<typeof loader>()
	const { user, totalPages, currentPage } = data

	return (
		<div className="flex flex-col gap-8">
			<Card className="w-full">
				<CardHeader className="flex flex-row items-center">
					<div className="grid gap-2">
						<CardTitle className="text-base font-semibold leading-6 text-gray-900">
							Incidents
						</CardTitle>
					</div>
					<div className="flex items-center gap-2 ml-auto">
						<SearchBar
							status={data.status}
							action={`/profile/${user.id}/incidents`}
							autoSubmit
						/>

						<Button asChild size="sm" className="ml-auto gap-1">
							<Link to="new">
								<PlusCircle className="h-4 w-4" />
								Add
							</Link>
						</Button>
						<Button asChild size="sm" className="ml-auto gap-1">
							<Link to={`/profile/${user.id}`}>
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
									<TableHead>Incident Number</TableHead>
									<TableHead>Type</TableHead>
									<TableHead>Severity</TableHead>
									<TableHead>Location</TableHead>
									<TableHead>Date & Time</TableHead>
									<TableHead>Occured While</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="w-1/6 text-right pr-6">
										Actions
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.status === 'idle' ? (
									data.incidents.length > 0 ? (
										data.incidents.map((incident: any) => (
											<TableRow key={incident.id}>
												<TableCell>{incident.incidentNumber}</TableCell>
												<TableCell>{incident.incidentType.name}</TableCell>
												<TableCell>{incident.severity}</TableCell>
												<TableCell>{incident.location}</TableCell>
												<TableCell>
													{formatDate(incident.occuredAt)}{' '}
													{formatTime(incident.timeOfDay)}
												</TableCell>
												<TableCell>{incident.occuredWhile}</TableCell>
												<TableCell>
													<IncidentStatusBadge status={incident.status} />
												</TableCell>
												<TableCell className="py-1 text-right space-x-1 whitespace-nowrap">
													<Button asChild size="xs" title="View">
														<Link to={`${incident.id}`}>
															<EyeOpenIcon className="h-4 w-4" />
														</Link>
													</Button>
													{incident.status === 'SUBMITTED' ? (
														<>
															<Button asChild size="xs" title="Edit">
																<Link to={`${incident.id}/edit`}>
																	<EditIcon className="h-4 w-4" />
																</Link>
															</Button>
															<Button
																asChild
																size="xs"
																variant="destructive"
																title="Delete"
															>
																<Link to={`${incident.id}/delete`}>
																	<TrashIcon className="h-4 w-4" />
																</Link>
															</Button>
														</>
													) : (
														<span
															className="inline-flex align-middle text-muted-foreground"
															title="Being handled: can no longer be changed"
														>
															<LockIcon className="h-4 w-4" />
														</span>
													)}
												</TableCell>
											</TableRow>
										))
									) : (
										<TableRow>
											<TableCell colSpan={8} className="text-center">
												<h3 className="mt-2 text-sm font-semibold text-muted-foreground">
													No incidents found
												</h3>
											</TableCell>
										</TableRow>
									)
								) : data.status === 'error' ? (
									<TableRow>
										<TableCell colSpan={8} className="text-center">
											<ErrorList
												errors={['There was an error parsing the results']}
											/>
										</TableCell>
									</TableRow>
								) : (
									<TableRow>
										<TableCell colSpan={8} className="text-center">
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
