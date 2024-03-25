import { LoaderFunctionArgs, json, redirect } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { EditIcon, PlusCircle } from 'lucide-react'
import { z } from 'zod'
import { ErrorList } from '~/components/ErrorList'
import { SearchBar } from '~/components/SearchBar'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '~/components/ui/table'
import { prisma } from '~/utils/db.server'

const CountrySearchResultSchema = z.object({
	id: z.string().optional(),
	name: z.string({ required_error: 'Name is required' }),
	code: z.string({ required_error: 'Code is required' }),
	isMemberState: z.boolean().default(false),
})

const CountrySearchResultsSchema = z.array(CountrySearchResultSchema)

export async function loader({ request }: LoaderFunctionArgs) {
	const searchTerm = new URL(request.url).searchParams.get('search')
	if (searchTerm === '') {
		return redirect('/settings/countries')
	}

	const like = `%${searchTerm ?? ''}%`
	const likePattern = `%${like}%`
	const rawCountries = await prisma.$queryRaw`
    SELECT id, name, code, "isMemberState"
    FROM "Country"
    WHERE name ILIKE ${likePattern}
    OR code ILIKE ${likePattern}
    ORDER BY name DESC
    LIMIT 50
`

	const result = CountrySearchResultsSchema.safeParse(rawCountries)
	if (!result.success) {
		return json({ status: 'error', error: result.error.message } as const, {
			status: 400,
		})
	}
	return json({ status: 'idle', countries: result.data } as const)
}

export default function CountriesRoute() {
	const data = useLoaderData<typeof loader>()

	return (
		<div className="flex flex-col gap-8">
			<Card className="w-full">
				<CardHeader className="flex flex-row items-center">
					<div className="grid gap-2">
						<CardTitle>Countries</CardTitle>
					</div>
					<div className="flex items-center gap-2 ml-auto">
						<SearchBar status={data.status} autoSubmit />

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
									<TableHead className="w-1/3">Name</TableHead>
									<TableHead className="w-1/4">Code</TableHead>
									<TableHead className="w-1/4">Member State</TableHead>
									<TableHead className="w-1/6 text-right pr-6">
										Actions
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.status === 'idle' ? (
									data.countries.length > 0 ? (
										data.countries.map(country => (
											<TableRow key={country.id}>
												<TableCell className="py-1">{country.name}</TableCell>
												<TableCell className="py-1">{country.code}</TableCell>
												<TableCell className="py-1">
													{country.isMemberState ? 'Yes' : 'No'}
												</TableCell>
												<TableCell className="py-1 text-right">
													<Button asChild size="xs">
														<Link to={`${country.id}/edit`}>
															<EditIcon className="h-4 w-4 mr-1" />
															Edit
														</Link>
													</Button>
												</TableCell>
											</TableRow>
										))
									) : (
										<TableRow>
											<TableCell colSpan={4} className="text-center">
												No countries found
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
			</Card>
		</div>
	)
}
