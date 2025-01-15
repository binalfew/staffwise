import { EyeClosedIcon } from '@radix-ui/react-icons'
import { LoaderFunctionArgs, json } from '@remix-run/node'
import { Link, Outlet, useLoaderData } from '@remix-run/react'
import { CheckIcon, PaperclipIcon, PrinterIcon } from 'lucide-react'
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
import { requireUserWithRoles } from '~/utils/permission.server'

export async function loader({ params, request }: LoaderFunctionArgs) {
	await requireUserWithRoles(request, ['admin', 'carPassAdmin'])

	const { carPassRequestId } = params

	const carPassRequest = await prisma.carPassRequest.findUnique({
		where: { id: carPassRequestId },
		include: {
			attachments: true,
		},
	})

	invariantResponse(
		carPassRequest,
		`Car Pass request with id ${carPassRequestId} does not exist.`,
		{ status: 404 },
	)

	return json({ carPassRequest })
}

export default function CarPassRequestRoute() {
	const { carPassRequest } = useLoaderData<typeof loader>()

	type CarPassRequestSectionProps = {
		title: string
		url: string
		children: React.ReactNode
		showActions?: boolean
		showComplete?: boolean
	}

	const CarPassRequestSection: FC<CarPassRequestSectionProps> = ({
		title,
		url,
		children,
		showActions = true,
		showComplete = false,
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
						<a href={getEmployeeFileSrc(carPassRequest.id)}>
							<PrinterIcon className="h-4 w-4 text-orange-500 hover:text-orange-700" />
						</a>
					)}
					{showComplete && (
						<Link
							to={`/dashboard/car-pass-requests/${carPassRequest.id}/complete`}
						>
							<CheckIcon className="h-4 w-4 text-green-500 hover:text-green-700" />
						</Link>
					)}
				</div>
			</CardHeader>
			<Separator className="mb-2" />
			<CardContent className="grid gap-8 p-6">{children}</CardContent>
		</Card>
	)

	type CarPassRequestItemProps = {
		label: string
		value: string | number | undefined | null
		isDate?: boolean
		isTextArea?: boolean
	}

	const CarPassRequestItem: FC<CarPassRequestItemProps> = ({
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
				<CarPassRequestSection
					title={`Car Pass Request #${carPassRequest.requestNumber}`}
					url={`/dashboard/car-pass-requests`}
					showActions={false}
					showComplete={carPassRequest.status === 'PENDING'}
				>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{[
							{
								label: 'Request Number',
								value: carPassRequest.requestNumber,
							},
							{
								label: 'Requestor',
								value: carPassRequest.requestorEmail,
							},
							{
								label: 'Type',
								value: carPassRequest.type,
							},
							{ label: 'Reason', value: carPassRequest.reason },
							{
								label: 'Status',
								value: carPassRequest.status,
							},
							{
								label: 'Created At',
								value: carPassRequest.createdAt,
								isDate: true,
							},
						].map((item, idx) => (
							<CarPassRequestItem
								key={idx}
								label={item.label}
								value={item.value}
								isDate={item.isDate}
							/>
						))}
					</div>
				</CarPassRequestSection>
				<CarPassRequestSection
					title="Attachments"
					url={`/dashboard/car-pass-requests`}
					showActions={false}
				>
					{carPassRequest.attachments.map(attachment => (
						<a
							key={attachment.id}
							href={getAttachmentFileSrc(attachment.id)}
							className="flex items-center space-x-2 gap-2 font-medium text-green-600 hover:text-green-500"
						>
							<PaperclipIcon className="h-4 w-4" />
							{attachment.altText}
						</a>
					))}
				</CarPassRequestSection>
			</div>
		</div>
	)
}
