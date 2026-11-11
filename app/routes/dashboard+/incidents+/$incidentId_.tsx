import { EyeClosedIcon } from '@radix-ui/react-icons'
import { LoaderFunctionArgs, json } from '@remix-run/node'
import { Link, Outlet, useLoaderData } from '@remix-run/react'
import { format } from 'date-fns'
import {
	ArrowUpCircle,
	LaptopMinimal,
	ListChecks,
	PaperclipIcon,
	TrashIcon,
	UserPlusIcon,
} from 'lucide-react'
import { FC } from 'react'
import { IncidentStatusBadge } from '~/components/IncidentStatusBadge'
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
	formatFullName,
	getAttachmentFileSrc,
	invariantResponse,
} from '~/utils/misc.tsx'
import { requireIncidentAdmin } from '~/utils/incident-scope.server'

export async function loader({ params, request }: LoaderFunctionArgs) {
	const { scopeWhere } = await requireIncidentAdmin(request)

	const { incidentId } = params

	const incident = await prisma.incident.findFirst({
		where: { id: incidentId, ...scopeWhere },
		include: {
			attachments: true,
			incidentType: true,
			employee: {
				select: {
					firstName: true,
					middleName: true,
					familyName: true,
					email: true,
					mobileTelephoneNumber: true,
					officeTelephoneNumber: true,
					organ: { select: { name: true } },
					department: { select: { name: true } },
				},
			},
			assignments: {
				include: {
					officer: {
						include: { employee: true },
					},
				},
			},
			activities: {
				include: {
					officer: {
						include: { employee: true },
					},
				},
			},
			assessment: true,
			statusHistory: {
				orderBy: { createdAt: 'asc' },
				include: { changedBy: { select: { name: true, email: true } } },
			},
		},
	})

	invariantResponse(
		incident,
		`Incident with id ${incidentId} does not exist.`,
		{
			status: 404,
		},
	)

	const incidentTypes = await prisma.incidentType.findMany({
		orderBy: { name: 'asc' },
		select: { id: true, name: true },
	})

	return json({ incident, incidentTypes })
}

export default function DeleteIncidentRoute() {
	const { incident } = useLoaderData<typeof loader>()

	type IncidentSectionProps = {
		title: string
		url: string
		children: React.ReactNode
		showActions?: boolean
	}

	const IncidentSection: FC<IncidentSectionProps> = ({
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
						<>
							<Link
								to={`/dashboard/incidents/${incident.id}/assignments/new`}
								preventScrollReset
							>
								<UserPlusIcon className="h-4 w-4 text-orange-500 hover:text-orange-7000" />
							</Link>
							<Link
								to={`/dashboard/incidents/${incident.id}/assessment`}
								preventScrollReset
							>
								<LaptopMinimal className="h-4 w-4 text-orange-500 hover:text-orange-700" />
							</Link>
						</>
					)}
				</div>
			</CardHeader>
			<Separator className="mb-2" />
			<CardContent className="grid gap-8 p-6">{children}</CardContent>
		</Card>
	)

	type IncidentItemProps = {
		label: string
		value: string | number | undefined | null
		isDate?: boolean
		isTextArea?: boolean
	}

	const IncidentItem: FC<IncidentItemProps> = ({
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
				<Outlet />
				<IncidentSection title="Incident" url={`/dashboard/incidents`}>
					<div className="flex flex-wrap items-center gap-3">
						<span className="text-sm font-medium text-gray-700">Status</span>
						<IncidentStatusBadge status={incident.status} />
						<div className="ml-auto flex gap-2">
							<Button asChild size="sm" variant="outline" className="gap-1">
								<Link
									to={`/dashboard/incidents/${incident.id}/status`}
									preventScrollReset
								>
									<ListChecks className="h-4 w-4" />
									Change status
								</Link>
							</Button>
							<Button asChild size="sm" variant="destructive" className="gap-1">
								<Link
									to={`/dashboard/incidents/${incident.id}/escalate`}
									preventScrollReset
								>
									<ArrowUpCircle className="h-4 w-4" />
									Escalate
								</Link>
							</Button>
						</div>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{[
							{ label: 'Incident Number', value: incident.incidentNumber },
							{ label: 'Incident Type', value: incident.incidentType.name },
							{ label: 'Location', value: incident.location },
							{ label: 'Eye Witnesses', value: incident.eyeWitnesses },
							{ label: 'Occured While', value: incident.occuredWhile },
							{
								label: 'Occured At',
								value: incident.occuredAt,
								isDate: true,
							},
						].map((item, idx) => (
							<IncidentItem
								key={idx}
								label={item.label}
								value={item.value}
								isDate={item.isDate}
							/>
						))}
						<div className="md:col-span-2">
							<IncidentItem
								label="Description"
								value={incident.description}
								isTextArea={true}
							/>
						</div>
					</div>
				</IncidentSection>

				<IncidentSection
					title="Reported By"
					url={`/dashboard/incidents`}
					showActions={false}
				>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{[
							{
								label: 'Name',
								value: formatFullName(incident.employee),
							},
							{ label: 'Email', value: incident.employee.email },
							{
								label: 'Mobile Phone',
								value: incident.employee.mobileTelephoneNumber,
							},
							{
								label: 'Office Phone',
								value: incident.employee.officeTelephoneNumber,
							},
							{ label: 'Organ', value: incident.employee.organ?.name },
							{
								label: 'Department',
								value: incident.employee.department?.name,
							},
						].map((item, idx) => (
							<IncidentItem key={idx} label={item.label} value={item.value} />
						))}
					</div>
				</IncidentSection>

				<IncidentSection
					title="Officers"
					url={`/dashboard/incidents`}
					showActions={false}
				>
					{incident.assignments.length > 0 ? (
						<div className="overflow-x-auto rounded-md border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>ID</TableHead>
										<TableHead>Email</TableHead>
										<TableHead>First Name</TableHead>
										<TableHead>Middle Name</TableHead>
										<TableHead className="text-right pr-6">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{incident.assignments.map((assignment: any) => (
										<TableRow key={assignment.id}>
											<TableCell className="py-1">
												{assignment.officer.employee.auIdNumber}
											</TableCell>
											<TableCell className="py-1">
												{assignment.officer.employee.email}
											</TableCell>
											<TableCell className="py-1">
												{assignment.officer.employee.firstName}
											</TableCell>
											<TableCell className="py-1">
												{assignment.officer.employee.middleName}
											</TableCell>
											<TableCell className="py-1 flex justify-end gap-2">
												<Button asChild size="xs" variant="destructive">
													<Link
														to={`/dashboard/incidents/${incident.id}/assignments/${assignment.id}/delete`}
														preventScrollReset
													>
														<TrashIcon className="h-4 w-4" />
													</Link>
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					) : (
						<></>
					)}
				</IncidentSection>

				<IncidentSection
					title="Attachments"
					url={`/dashboard/incidents`}
					showActions={false}
				>
					{incident.attachments.length > 0 ? (
						incident.attachments.map(attachment => (
							<a
								key={attachment.id}
								href={getAttachmentFileSrc(attachment.id)}
								className="flex items-center space-x-2 gap-2 font-medium text-green-600 hover:text-green-500"
							>
								<PaperclipIcon className="h-4 w-4" />
								{attachment.altText}
							</a>
						))
					) : (
						<></>
					)}
				</IncidentSection>

				<IncidentSection
					title="Status Timeline"
					url={`/dashboard/incidents`}
					showActions={false}
				>
					<ol className="relative border-s border-gray-200 ms-2">
						<li className="mb-6 ms-4">
							<span className="absolute -start-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-gray-300" />
							<div className="flex flex-wrap items-center gap-2 text-sm">
								<IncidentStatusBadge status="SUBMITTED" />
								<span className="text-muted-foreground">
									Reported by {formatFullName(incident.employee)} ·{' '}
									{format(new Date(incident.createdAt), 'd MMM yyyy, HH:mm')}
								</span>
							</div>
						</li>
						{incident.statusHistory.map(entry => (
							<li key={entry.id} className="mb-6 ms-4">
								<span className="absolute -start-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-gray-400" />
								<div className="flex flex-wrap items-center gap-2 text-sm">
									{entry.fromStatus ? (
										<>
											<IncidentStatusBadge status={entry.fromStatus} />
											<span aria-hidden>→</span>
										</>
									) : null}
									<IncidentStatusBadge status={entry.toStatus} />
									<span className="text-muted-foreground">
										{entry.changedBy
											? entry.changedBy.name || entry.changedBy.email
											: 'System'}{' '}
										· {format(new Date(entry.createdAt), 'd MMM yyyy, HH:mm')}
									</span>
								</div>
								{entry.remarks ? (
									<p className="mt-1 text-sm text-gray-700">
										{entry.remarks}
										{entry.isVisibleToReporter ? null : (
											<span className="ms-2 rounded bg-yellow-100 px-1.5 py-0.5 text-xs font-medium text-yellow-800">
												Internal
											</span>
										)}
									</p>
								) : null}
							</li>
						))}
					</ol>
				</IncidentSection>

				<IncidentSection
					title="Activities"
					url={`/dashboard/incidents`}
					showActions={false}
				>
					{incident.activities.length > 0 ? (
						<div className="overflow-x-auto rounded-md border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Officer</TableHead>
										<TableHead>Date</TableHead>
										<TableHead>Activity</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{incident.activities.map((activity: any) => (
										<TableRow key={activity.id}>
											<TableCell>
												{formatFullName(activity.officer.employee)}
											</TableCell>
											<TableCell>{formatDate(activity.date)}</TableCell>
											<TableCell>{activity.activity}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					) : (
						<></>
					)}
				</IncidentSection>
			</div>
		</div>
	)
}
