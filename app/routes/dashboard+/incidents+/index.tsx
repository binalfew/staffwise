import { EyeOpenIcon } from '@radix-ui/react-icons'
import { LoaderFunctionArgs, json } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { ArrowLeftIcon, PlusCircle } from 'lucide-react'
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
import { formatDate, formatTime } from '~/utils/misc'
import { requireUserWithRoles } from '~/utils/permission.server'

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserWithRoles(request, ['admin', 'incidentAdmin'])

	const { data, totalPages, currentPage } = await filterAndPaginate({
		request,
		model: prisma.incident,
		searchFields: ['incidentNumber'],
		orderBy: [{ incidentNumber: 'asc' }],
		select: {
			id: true,
			incidentNumber: true,
			incidentType: { select: { name: true } },
			location: true,
			severity: true,
			occuredAt: true,
			timeOfDay: true,
			occuredWhile: true,
		},
	})

	return json({
		status: 'idle',
		incidents: data,
		totalPages,
		currentPage,
	} as const)
}

export default function IncidentsRoute() {
	const data = useLoaderData<typeof loader>()
	const { totalPages, currentPage } = data

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
							action={`/dashboard/incidents`}
							autoSubmit
						/>
						<Button asChild size="sm" className="ml-auto gap-1">
							<Link to="new">
								<PlusCircle className="h-4 w-4" />
								Add
							</Link>
						</Button>
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
									<TableHead>Incident Number</TableHead>
									<TableHead>Type</TableHead>
									<TableHead>Location</TableHead>
									<TableHead>Severity</TableHead>
									<TableHead>Date & Time</TableHead>
									<TableHead>Occured While</TableHead>
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
												<TableCell className="py-1">
													{incident.incidentNumber}
												</TableCell>
												<TableCell className="py-1">
													{incident.incidentType.name}
												</TableCell>
												<TableCell className="py-1">
													{incident.location}
												</TableCell>
												<TableCell className="py-1">
													{incident.severity}
												</TableCell>
												<TableCell className="py-1">
													{formatDate(incident.occuredAt)}{' '}
													{formatTime(incident.timeOfDay)}
												</TableCell>
												<TableCell className="py-1">
													{incident.occuredWhile}
												</TableCell>
												<TableCell className="py-1 text-right space-x-1">
													<Button asChild size="xs">
														<Link to={`${incident.id}`}>
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
													No incidents found
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
