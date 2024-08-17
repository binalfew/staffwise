import { EyeClosedIcon, EyeOpenIcon } from '@radix-ui/react-icons'
import { LoaderFunctionArgs, json } from '@remix-run/node'
import { Link, Outlet, useLoaderData } from '@remix-run/react'
import { PrinterIcon } from 'lucide-react'
import { FC } from 'react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Separator } from '~/components/ui/separator'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '~/components/ui/table'
import { Textarea } from '~/components/ui/textarea'
import { prisma } from '~/utils/db.server.ts'
import {
	formatDate,
	getEmployeeFileSrc,
	invariantResponse,
} from '~/utils/misc.tsx'
import { requireUserWithRoles } from '~/utils/permission.server'

export async function loader({ params, request }: LoaderFunctionArgs) {
	await requireUserWithRoles(request, ['admin', 'accessRequestAdmin'])

	const { accessRequestId } = params

	const accessRequest = await prisma.accessRequest.findUnique({
		where: { id: accessRequestId },
		include: { visitors: true },
	})

	invariantResponse(
		accessRequest,
		`Access request with id ${accessRequestId} does not exist.`,
		{ status: 404 },
	)

	return json({ accessRequest })
}

export default function DeleteIncidentRoute() {
	const { accessRequest } = useLoaderData<typeof loader>()

	type AccessRequestSectionProps = {
		title: string
		url: string
		children: React.ReactNode
		showActions?: boolean
	}

	const AccessRequestSection: FC<AccessRequestSectionProps> = ({
		title,
		url,
		children,
		showActions = true,
	}) => (
		<Card className="xl:col-span-2 bg-white shadow-sm rounded-sm">
			<CardHeader className="flex flex-row items-center py-2 px-6 bg-gray-100 rounded-t-lg">
				<div className="grid gap-1">
					<CardTitle className="text-base font-semibold leading-6 text-gray-900">
						{title}
					</CardTitle>
				</div>
				<div className="flex items-center gap-2 ml-auto">
					<Link to={url}>
						<EyeClosedIcon className="h-4 w-4 text-orange-500 hover:text-orange-700" />
					</Link>
					{showActions && (
						<a href={getEmployeeFileSrc(accessRequest.id)}>
							<PrinterIcon className="h-4 w-4 text-orange-500 hover:text-orange-700" />
						</a>
					)}
				</div>
			</CardHeader>
			<Separator className="mb-2" />
			<CardContent className="grid gap-8 p-6">{children}</CardContent>
		</Card>
	)

	type AccessRequestItemProps = {
		label: string
		value: string | number | undefined | null
		isDate?: boolean
		isTextArea?: boolean
	}

	const AccessRequestItem: FC<AccessRequestItemProps> = ({
		label,
		value,
		isDate,
		isTextArea,
	}) => (
		<div className="space-y-2">
			<Label
				htmlFor={label}
				className="block text-sm font-medium text-gray-700"
			>
				{label}
			</Label>
			<div className="mt-1">
				{!isTextArea ? (
					<Input
						readOnly
						id={label}
						value={
							isDate && typeof value === 'string'
								? formatDate(value)
								: typeof value === 'string' || typeof value === 'number'
								? String(value)
								: ''
						}
						className="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm bg-gray-50"
					/>
				) : (
					<Textarea
						readOnly
						id={label}
						value={value ?? ''}
						className="block w-full rounded-md border-gray-3000 shadow-sm sm:text-sm bg-gray-50"
					/>
				)}
			</div>
		</div>
	)

	return (
		<div className="grid gap-6">
			<div className="grid gap-4 md:gap-8">
				<AccessRequestSection
					title={`Access Request #${accessRequest.requestNumber}`}
					url={`/dashboard/access-requests`}
					showActions={false}
				>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{[
							{
								label: 'Start Date',
								value: accessRequest.startDate,
								isDate: true,
							},
							{
								label: 'End Date',
								value: accessRequest.endDate,
								isDate: true,
							},
						].map((item, idx) => (
							<AccessRequestItem
								key={idx}
								label={item.label}
								value={item.value}
								isDate={item.isDate}
							/>
						))}
					</div>
				</AccessRequestSection>

				<AccessRequestSection
					title="Visitors"
					url={`/dashboard/access-requests`}
					showActions={false}
				>
					<Outlet />
					<div className="overflow-x-auto rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>First Name</TableHead>
									<TableHead>Family Name</TableHead>
									<TableHead>Telephone</TableHead>
									<TableHead>Organization</TableHead>
									<TableHead>Visiting</TableHead>
									<TableHead>Destination</TableHead>
									<TableHead>Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{accessRequest.visitors.length > 0 ? (
									accessRequest.visitors.map(visitor => (
										<TableRow key={visitor.id}>
											<TableCell className="py-1">
												{visitor.firstName}
											</TableCell>
											<TableCell className="py-1">
												{visitor.familyName}
											</TableCell>
											<TableCell className="py-1">
												{visitor.telephone}
											</TableCell>
											<TableCell className="py-1">
												{visitor.organization}
											</TableCell>
											<TableCell className="py-1">
												{visitor.whomToVisit}
											</TableCell>
											<TableCell className="py-1">
												{visitor.destination}
											</TableCell>
											<TableCell className="py-1 text-right space-x-1">
												<Button asChild size="xs" variant="destructive">
													<Link
														to={`/dashboard/access-requests/${accessRequest.id}/visitors/${visitor.id}`}
													>
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
												No visitors found
											</h3>
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
				</AccessRequestSection>
			</div>
		</div>
	)
}
