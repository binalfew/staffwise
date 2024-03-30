import { LoaderFunctionArgs, json } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { EditIcon, PlusCircle, TrashIcon } from 'lucide-react'
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

export async function loader({ request }: LoaderFunctionArgs) {
	const { data, totalPages, currentPage } = await filterAndPaginate({
		request,
		model: prisma.organ,
		searchFields: ['name', 'code', 'address'],
		orderBy: [{ name: 'asc' }],
		select: {
			id: true,
			name: true,
			code: true,
			countryId: true,
			address: true,
			country: { select: { name: true } },
		},
	})

	return json({
		status: 'idle',
		organs: data,
		totalPages,
		currentPage,
	} as const)
}

export default function OrgansRoute() {
	const data = useLoaderData<typeof loader>()

	const { totalPages, currentPage } = data

	return (
		<div className="flex flex-col gap-8">
			<Card className="w-full">
				<CardHeader className="flex flex-row items-center">
					<div className="grid gap-2">
						<CardTitle className="text-base font-semibold leading-6 text-gray-900">
							Organs
						</CardTitle>
					</div>
					<div className="flex items-center gap-2 ml-auto">
						<SearchBar
							status={data.status}
							action="/settings/organs"
							autoSubmit
						/>

						<Button asChild size="sm" className="ml-auto gap-1">
							<Link to="new">
								<PlusCircle className="h-4 w-4" />
								Add
							</Link>
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					<div className="overflow-x-auto rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead>Code</TableHead>
									<TableHead>Country</TableHead>
									<TableHead>Address</TableHead>
									<TableHead className="text-right pr-6">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.status === 'idle' ? (
									data.organs.length > 0 ? (
										data.organs.map((organ: any) => (
											<TableRow key={organ.id}>
												<TableCell className="py-1">{organ.name}</TableCell>
												<TableCell className="py-1">{organ.code}</TableCell>
												<TableCell className="py-1">
													{organ.country.name}
												</TableCell>
												<TableCell className="py-1">{organ.address}</TableCell>
												<TableCell className="py-1 text-right space-x-1">
													<Button asChild size="xs">
														<Link to={`${organ.id}/edit`}>
															<EditIcon className="h-4 w-4" />
														</Link>
													</Button>
													<Button asChild size="xs" variant="destructive">
														<Link to={`${organ.id}/delete`}>
															<TrashIcon className="h-4 w-4" />
														</Link>
													</Button>
												</TableCell>
											</TableRow>
										))
									) : (
										<TableRow>
											<TableCell colSpan={5} className="text-center">
												<h3 className="mt-2 text-sm font-semibold text-muted-foreground">
													No organs found
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
