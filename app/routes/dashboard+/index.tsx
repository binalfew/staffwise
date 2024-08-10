import { LoaderFunctionArgs } from '@remix-run/node'
import { Link, json, useLoaderData } from '@remix-run/react'
import { ArrowUpRightIcon } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { GeneralErrorBoundary } from '~/components/ui/error-boundary'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '~/components/ui/table'
import { prisma } from '~/utils/db.server'
import { requireUserWithRole } from '~/utils/permission.server'

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserWithRole(request, 'admin')

	const countries = await prisma.country.findMany({
		take: 5,
		select: { id: true, name: true, code: true },
	})

	const organs = await prisma.organ.findMany({
		take: 5,
		select: { id: true, name: true, code: true },
	})

	return json({
		countries,
		organs,
	})
}

export default function IndexRoute() {
	const { countries, organs } = useLoaderData<typeof loader>()

	return (
		<div className="grid gap-6">
			<div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
				<Card className="xl:col-span-2">
					<CardHeader className="flex flex-row items-center">
						<div className="grid gap-2">
							<CardTitle className="text-base font-semibold leading-6 text-gray-900">
								Organs
							</CardTitle>
						</div>
						<div className="flex items-center gap-2 ml-auto">
							<Button asChild size="xs" className="ml-auto gap-1">
								<Link to="/settings/organs">
									<ArrowUpRightIcon className="h-4 w-4" />
									View All
								</Link>
							</Button>
						</div>
					</CardHeader>

					<CardContent className="grid gap-8">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead className="text-right">Code</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{organs.map(organ => (
									<TableRow key={organ.id}>
										<TableCell>
											<div className="font-medium">{organ.name}</div>
										</TableCell>
										<TableCell className="text-right">{organ.code}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center">
						<div className="grid gap-2">
							<CardTitle className="text-base font-semibold leading-6 text-gray-900">
								Countries
							</CardTitle>
						</div>
						<div className="flex items-center gap-2 ml-auto">
							<Button asChild size="xs" className="ml-auto gap-1">
								<Link to="/settings/countries">
									<ArrowUpRightIcon className="h-4 w-4" />
									View All
								</Link>
							</Button>
						</div>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead className="text-right">Code</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{countries.map(country => (
									<TableRow key={country.id}>
										<TableCell>
											<div className="font-medium">{country.name}</div>
										</TableCell>
										<TableCell className="text-right">{country.code}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				403: () => <p>You are not allowed to do that</p>,
			}}
		/>
	)
}
