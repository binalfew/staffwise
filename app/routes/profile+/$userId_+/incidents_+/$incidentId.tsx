import { LoaderFunctionArgs, json } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { format } from 'date-fns'
import { ArrowLeftIcon, EditIcon, PaperclipIcon, TrashIcon } from 'lucide-react'
import { IncidentStatusBadge } from '~/components/IncidentStatusBadge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { prisma } from '~/utils/db.server'
import {
	formatDate,
	formatTime,
	getAttachmentFileSrc,
	invariantResponse,
} from '~/utils/misc'
import { requireOwnIncident } from './__incident-access.server'

export async function loader({ params, request }: LoaderFunctionArgs) {
	const { user, incident: own } = await requireOwnIncident(request, params)

	const incident = await prisma.incident.findUnique({
		where: { id: own.id },
		select: {
			id: true,
			incidentNumber: true,
			status: true,
			severity: true,
			location: true,
			description: true,
			eyeWitnesses: true,
			occuredWhile: true,
			occuredAt: true,
			timeOfDay: true,
			createdAt: true,
			incidentType: { select: { name: true } },
			attachments: { select: { id: true, altText: true } },
			statusHistory: {
				orderBy: { createdAt: 'asc' },
				select: {
					id: true,
					fromStatus: true,
					toStatus: true,
					remarks: true,
					isVisibleToReporter: true,
					createdAt: true,
				},
			},
		},
	})
	invariantResponse(incident, 'Incident not found', { status: 404 })

	// Reporters see every status change, but internal remarks stay on the server.
	const timeline = incident.statusHistory.map(
		({ isVisibleToReporter, remarks, ...entry }) => ({
			...entry,
			remarks: isVisibleToReporter ? remarks : null,
		}),
	)

	return json({
		userId: user.id,
		incident: { ...incident, statusHistory: undefined },
		timeline,
	})
}

function Detail({ label, value }: { label: string; value?: string | null }) {
	return (
		<div>
			<dt className="text-sm font-medium text-gray-500">{label}</dt>
			<dd className="mt-1 text-sm text-gray-900 whitespace-pre-line">
				{value || '—'}
			</dd>
		</div>
	)
}

export default function ReporterIncidentRoute() {
	const { userId, incident, timeline } = useLoaderData<typeof loader>()
	const editable = incident.status === 'SUBMITTED'

	return (
		<div className="flex flex-col gap-8">
			<Card className="w-full">
				<CardHeader className="flex flex-row flex-wrap items-center gap-3">
					<CardTitle className="text-base font-semibold leading-6 text-gray-900">
						Incident {incident.incidentNumber}
					</CardTitle>
					<IncidentStatusBadge status={incident.status} />
					<div className="ml-auto flex items-center gap-2">
						{editable ? (
							<>
								<Button asChild size="sm" className="gap-1">
									<Link to="edit">
										<EditIcon className="h-4 w-4" />
										Edit
									</Link>
								</Button>
								<Button
									asChild
									size="sm"
									variant="destructive"
									className="gap-1"
								>
									<Link to="delete">
										<TrashIcon className="h-4 w-4" />
										Delete
									</Link>
								</Button>
							</>
						) : null}
						<Button asChild size="sm" variant="outline" className="gap-1">
							<Link to={`/profile/${userId}/incidents`}>
								<ArrowLeftIcon className="h-4 w-4" />
								Back
							</Link>
						</Button>
					</div>
				</CardHeader>
				<CardContent className="grid gap-8">
					{!editable ? (
						<p className="rounded-md bg-blue-50 px-4 py-3 text-sm text-blue-800">
							This incident is being handled, so it can no longer be changed.
							Contact the security office if you need to add information.
						</p>
					) : null}

					<dl className="grid grid-cols-1 gap-6 md:grid-cols-2">
						<Detail label="Incident Type" value={incident.incidentType.name} />
						<Detail label="Severity" value={incident.severity} />
						<Detail label="Location" value={incident.location} />
						<Detail
							label="Date & Time"
							value={`${formatDate(incident.occuredAt)} ${formatTime(
								incident.timeOfDay,
							)}`}
						/>
						<Detail label="Occured While" value={incident.occuredWhile} />
						<Detail label="Eye Witnesses" value={incident.eyeWitnesses} />
						<div className="md:col-span-2">
							<Detail label="Description" value={incident.description} />
						</div>
					</dl>

					{incident.attachments.length > 0 ? (
						<div className="grid gap-2">
							<h3 className="text-sm font-medium text-gray-500">Attachments</h3>
							{incident.attachments.map(attachment => (
								<a
									key={attachment.id}
									href={getAttachmentFileSrc(attachment.id)}
									className="flex items-center gap-2 text-sm font-medium text-green-600 hover:text-green-500"
								>
									<PaperclipIcon className="h-4 w-4" />
									{attachment.altText}
								</a>
							))}
						</div>
					) : null}
				</CardContent>
			</Card>

			<Card className="w-full">
				<CardHeader>
					<CardTitle className="text-base font-semibold leading-6 text-gray-900">
						Progress
					</CardTitle>
				</CardHeader>
				<CardContent>
					<ol className="relative ms-2 border-s border-gray-200">
						<li className="mb-6 ms-4">
							<span className="absolute -start-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-gray-300" />
							<div className="flex flex-wrap items-center gap-2 text-sm">
								<IncidentStatusBadge status="SUBMITTED" />
								<span className="text-muted-foreground">
									You reported this incident ·{' '}
									{format(new Date(incident.createdAt), 'd MMM yyyy, HH:mm')}
								</span>
							</div>
						</li>
						{timeline.map(entry => (
							<li key={entry.id} className="mb-6 ms-4">
								<span className="absolute -start-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-gray-400" />
								<div className="flex flex-wrap items-center gap-2 text-sm">
									<IncidentStatusBadge status={entry.toStatus} />
									<span className="text-muted-foreground">
										{format(new Date(entry.createdAt), 'd MMM yyyy, HH:mm')}
									</span>
								</div>
								{entry.remarks ? (
									<p className="mt-1 text-sm text-gray-700">{entry.remarks}</p>
								) : null}
							</li>
						))}
					</ol>
				</CardContent>
			</Card>
		</div>
	)
}
