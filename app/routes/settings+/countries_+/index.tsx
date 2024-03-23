import { LoaderFunctionArgs, json } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { PlusCircle } from 'lucide-react'
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

export async function loader({ params }: LoaderFunctionArgs) {
	const countries = await prisma.country.findMany({
		select: {
			id: true,
			name: true,
			code: true,
			isMemberState: true,
		},
	})

	return json({ countries })
}

export default function CountriesRoute() {
	const { countries } = useLoaderData<typeof loader>()
	return (
		<div className="flex flex-col gap-8">
			<Card className="w-full">
				<CardHeader className="flex flex-row items-center">
					<div className="grid gap-2">
						<CardTitle>Registered Countries</CardTitle>
					</div>
					<Button asChild size="sm" className="ml-auto gap-1">
						<Link to="new">
							<PlusCircle className="h-4 w-4" />
							Add New
						</Link>
					</Button>
				</CardHeader>
				<CardContent>
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead>Code</TableHead>
									<TableHead>Member State</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{countries.map(country => (
									<TableRow key={country.id}>
										<TableCell>{country.name}</TableCell>
										<TableCell>{country.code}</TableCell>
										<TableCell>
											{country.isMemberState ? 'Yes' : 'No'}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
