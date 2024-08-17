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
		model: prisma.permission,
		searchFields: ['entity', 'action', 'access'],
		orderBy: [{ entity: 'asc' }],
	})

	return json({
		status: 'idle',
		permissions: data,
		totalPages,
		currentPage,
	} as const)
}

export default function RolesRoute() {
	const data = useLoaderData<typeof loader>()
	const { totalPages, currentPage } = data

	return (
		<div className="flex flex-col gap-8">
			<Card className="w-full">
				<CardHeader className="flex flex-row items-center">
					<div className="grid gap-2">
						<CardTitle className="text-base font-semibold leading-6 text-gray-9000">
							Permissions
						</CardTitle>
					</div>
					<div className="flex items-center gap-2 ml-auto">
						<SearchBar
							status={data.status}
							action="/settings/permissions"
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
									<TableHead className="w-1/3">Entity</TableHead>
									<TableHead className="w-1/4">Action</TableHead>
									<TableHead className="w-1/4">Access</TableHead>
									<TableHead className="w-1/6 text-right pr-6">
										Actions
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.status === 'idle' ? (
									data.permissions.length > 0 ? (
										data.permissions.map(permission => (
											<TableRow key={permission.id}>
												<TableCell className="py-1">
													{permission.entity}
												</TableCell>
												<TableCell className="py-1">
													{permission.action}
												</TableCell>
												<TableCell className="py-1">
													{permission.access}
												</TableCell>
												<TableCell className="py-1 text-right space-x-1">
													<Button asChild size="xs">
														<Link to={`${permission.id}/edit`}>
															<EditIcon className="h-4 w-4" />
														</Link>
													</Button>
													<Button asChild size="xs" variant="destructive">
														<Link to={`${permission.id}/delete`}>
															<TrashIcon className="h-4 w-4" />
														</Link>
													</Button>
												</TableCell>
											</TableRow>
										))
									) : (
										<TableRow>
											<TableCell colSpan={4} className="text-center">
												<h3 className="mt-2 text-sm font-semibold text-muted-foreground">
													No permissions found
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
				<CardFooter className="border-t px-6 py-4">
					<Paginator totalPages={totalPages} currentPage={currentPage} />
				</CardFooter>
			</Card>
		</div>
	)
}