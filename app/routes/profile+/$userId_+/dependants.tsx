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
		model: prisma.dependant,
		searchFields: ['firstName', 'familyName'],
		where: {
			employeeId: employee.id,
		},
		orderBy: [{ familyName: 'asc' }],
		select: {
			id: true,
			firstName: true,
			familyName: true,
			middleName: true,
			relationship: {
				select: {
					name: true,
				},
			},
		},
	})

	return json({
		user,
		status: 'idle',
		dependants: data,
		totalPages,
		currentPage,
	} as const)
}

export default function DependantsRoute() {
	const { dependants, totalPages, currentPage, status, user } =
		useLoaderData<typeof loader>()

	return (
		<div className="flex flex-col gap-8">
			<Card className="w-full">
				<CardHeader className="flex flex-row items-center">
					<div className="grid gap-2">
						<CardTitle className="text-base font-semibold leading-6 text-gray-900">
							Dependants
						</CardTitle>
					</div>
					<div className="flex items-center gap-2 ml-auto">
						<SearchBar
							status={status}
							action={`/profile/${user.id}/dependants`}
							autoSubmit
						/>
						<Button asChild size="sm">
							<Link to="new">
								<PlusCircle className="h-4 w-4" />
								Add
							</Link>
						</Button>
						<Button asChild size="sm">
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
									<TableHead>First Name</TableHead>
									<TableHead>Family Name</TableHead>
									<TableHead>Middle Name</TableHead>
									<TableHead>Relationship</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{dependants.length > 0 ? (
									dependants.map((dependant: any) => (
										<TableRow key={dependant.id}>
											<TableCell>{dependant.firstName}</TableCell>
											<TableCell>{dependant.familyName}</TableCell>
											<TableCell>{dependant.middleName}</TableCell>
											<TableCell>{dependant.relationship.name}</TableCell>
											<TableCell className="py-1 text-right space-x-1">
												<Button asChild size="xs">
													<Link to={`${dependant.id}/edit`}>
														<EditIcon className="h-4 w-4" />
													</Link>
												</Button>
												<Button asChild size="xs" variant="destructive">
													<Link to={`${dependant.id}/delete`}>
														<TrashIcon className="h-4 w-4" />
													</Link>
												</Button>
											</TableCell>
										</TableRow>
									))
								) : (
									<TableRow>
										<TableCell colSpan={8} className="text-center">
											No dependants found
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
