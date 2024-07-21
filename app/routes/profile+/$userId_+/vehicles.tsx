import { LoaderFunctionArgs, json } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { ArrowLeftIcon, EditIcon, PlusCircle, TrashIcon } from 'lucide-react'
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
import { invariantResponse } from '~/utils/misc'

export async function loader({ params, request }: LoaderFunctionArgs) {
	const user = await requireUser(request)
	invariantResponse(user.id === params.userId, 'Not authorized', {
		status: 403,
	})

	const employee = await prisma.employee.findFirst({
		where: { email: user.email },
	})

	invariantResponse(employee, 'Employee not found', { status: 404 })

	const { data, totalPages, currentPage } = await filterAndPaginate({
		request,
		model: prisma.vehicle,
		searchFields: ['make', 'model', 'plateNumber'],
		where: { employeeId: employee.id },
		orderBy: [{ make: 'asc' }, { model: 'asc' }],
		select: {
			id: true,
			make: true,
			model: true,
			year: true,
			color: true,
			plateNumber: true,
			capacity: true,
		},
	})

	return json({
		status: 'idle',
		user,
		vehicles: data,
		totalPages,
		currentPage,
	} as const)
}

export default function VehiclesRoute() {
	const { vehicles, totalPages, currentPage, status, user } =
		useLoaderData<typeof loader>()

	return (
		<div className="flex flex-col gap-8">
			<Card className="w-full">
				<CardHeader className="flex flex-row items-center">
					<div className="grid gap-2">
						<CardTitle className="text-base font-semibold leading-6 text-gray-900">
							Vehicles
						</CardTitle>
					</div>
					<div className="flex items-center gap-2 ml-auto">
						<SearchBar
							status={status}
							action={`/profile/${user.id}/vehicles`}
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
									<TableHead>Make</TableHead>
									<TableHead>Model</TableHead>
									<TableHead>Year</TableHead>
									<TableHead>Color</TableHead>
									<TableHead>Plate Number</TableHead>
									<TableHead>Capacity</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{vehicles.length > 0 ? (
									vehicles.map((vehicle: any) => (
										<TableRow key={vehicle.id}>
											<TableCell className="py-1">{vehicle.make}</TableCell>
											<TableCell className="py-1">{vehicle.model}</TableCell>
											<TableCell className="py-1">{vehicle.year}</TableCell>
											<TableCell className="py-1">{vehicle.color}</TableCell>
											<TableCell className="py-1">
												{vehicle.plateNumber}
											</TableCell>
											<TableCell className="py-1">{vehicle.capacity}</TableCell>
											<TableCell className="text-right py-1 space-x-1">
												<Button asChild size="xs">
													<Link to={`${vehicle.id}/edit`}>
														<EditIcon className="h-4 w-4" />
													</Link>
												</Button>
												<Button asChild size="xs" variant="destructive">
													<Link to={`${vehicle.id}/delete`}>
														<TrashIcon className="h-4 w-4" />
													</Link>
												</Button>
											</TableCell>
										</TableRow>
									))
								) : (
									<TableRow>
										<TableCell colSpan={7} className="text-center">
											No vehicles found
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
