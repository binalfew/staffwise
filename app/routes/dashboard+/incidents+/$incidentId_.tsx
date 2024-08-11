import { EyeClosedIcon } from '@radix-ui/react-icons'
import { LoaderFunctionArgs, json } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { PaperclipIcon, PrinterIcon } from 'lucide-react'
import { FC } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Separator } from '~/components/ui/separator'
import { Textarea } from '~/components/ui/textarea'
import { prisma } from '~/utils/db.server.ts'
import {
	formatDate,
	getAttachmentFileSrc,
	getEmployeeFileSrc,
	invariantResponse,
} from '~/utils/misc.tsx'

export async function loader({ params }: LoaderFunctionArgs) {
	const { incidentId } = params

	const incident = await prisma.incident.findUnique({
		where: { id: incidentId },
		include: { attachments: true, incidentType: true },
	})

	invariantResponse(incident, 'Not Found', { status: 404 })

	const incidentTypes = await prisma.incidentType.findMany({
		select: { id: true, name: true },
	})

	return json({ incident, incidentTypes })
}

export default function DeleteIncidentRoute() {
	const { incident, incidentTypes } = useLoaderData<typeof loader>()

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
						<a href={getEmployeeFileSrc(incident.id)}>
							<PrinterIcon className="h-4 w-4 text-orange-500 hover:text-orange-700" />
						</a>
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
				<IncidentSection title="Incident" url={`/dashboard/incidents`}>
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
					title="Attachments"
					url={`/dashboard/incidents`}
					showActions={false}
				>
					{incident.attachments.map(attachment => (
						<a
							key={attachment.id}
							href={getAttachmentFileSrc(attachment.id)}
							className="flex items-center space-x-2 gap-2 font-medium text-green-600 hover:text-green-500"
						>
							<PaperclipIcon className="h-4 w-4" />
							{attachment.altText}
						</a>
					))}
				</IncidentSection>
			</div>
		</div>
	)
}
