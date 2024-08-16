import { EyeOpenIcon } from '@radix-ui/react-icons'
import { LoaderFunctionArgs, json } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { formatDate } from 'date-fns'
import { ArrowLeftIcon } from 'lucide-react'
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
import { requireUserWithRoles } from '~/utils/permission.server'

export async function loader({ params, request }: LoaderFunctionArgs) {
	await requireUserWithRoles(request, ['admin', 'carPassAdmin'])

	const { data, totalPages, currentPage } = await filterAndPaginate({
		request,
		model: prisma.carPassRequest,
		searchFields: ['requestNumber', 'requestorEmail'],
		orderBy: [{ createdAt: 'asc' }],
		select: {
			id: true,
			requestNumber: true,
			requestorEmail: true,
			status: true,
			type: true,
			reason: true,
			createdAt: true,
		},
	})

	return json({
		status: 'idle',
		carPassRequests: data,
		totalPages,
		currentPage,
	} as const)
}

export default function CarPassRequestsRoute() {
	const { carPassRequests, totalPages, currentPage, status } =
		useLoaderData<typeof loader>()

	return (
		<div className="flex flex-col gap-8">
			<Card className="w-full">
				<CardHeader className="flex flex-row items-center">
					<div className="grid gap-2">
						<CardTitle className="text-base font-semibold leading-6 text-gray-9000">
							Car Pass Requests
						</CardTitle>
					</div>
					<div className="flex items-center gap-2 ml-auto">
						<SearchBar
							status={status}
							action="/dashboard/car-pass-requests"
							autoSubmit
						/>

						<Button asChild size="sm" className="ml-auto gap-1">
							<Link to="/dashboard">
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
									<TableHead>Type</TableHead>
									<TableHead>Reason</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Created At</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{carPassRequests.length > 0 ? (
									carPassRequests.map((carPassRequest: any) => (
										<TableRow key={carPassRequest.id}>
											<TableCell className="py-1">
												{carPassRequest.requestNumber}
											</TableCell>
											<TableCell className="py-1">
												{carPassRequest.requestorEmail}
											</TableCell>
											<TableCell className="py-1">
												{carPassRequest.type}
											</TableCell>
											<TableCell className="py-1">
												{carPassRequest.reason}
											</TableCell>
											<TableCell className="py-1">
												{carPassRequest.status}
											</TableCell>
											<TableCell className="py-1">
												{formatDate(carPassRequest.createdAt, 'MM/dd/yyyy')}
											</TableCell>
											<TableCell className="text-right py-1 space-x-1">
												<Button asChild size="xs">
													<Link to={`${carPassRequest.id}`}>
														<EyeOpenIcon className="h-4 w-4" />
													</Link>
												</Button>
											</TableCell>
										</TableRow>
									))
								) : (
									<TableRow>
										<TableCell colSpan={7} className="text-center">
											No Car Pass requests found
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
				</CardContent>
				{totalPages > 0 && (
					<CardFooter>
						<Paginator totalPages={totalPages} currentPage={currentPage} />
					</CardFooter>
				)}
			</Card>
		</div>
	)
}
