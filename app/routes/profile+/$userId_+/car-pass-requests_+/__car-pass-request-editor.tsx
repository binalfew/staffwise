import { FieldMetadata, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import {
	Attachment,
	CarPassRequest,
	EmployeeCarPassRequest,
	Vehicle,
} from '@prisma/client'
import { SerializeFrom } from '@remix-run/node'
import { Link, useActionData, useParams } from '@remix-run/react'
import {
	AlertCircleIcon,
	PaperclipIcon,
	PlusCircle,
	TrashIcon,
} from 'lucide-react'
import { z } from 'zod'
import FormCard from '~/components/FormCard'
import FormField from '~/components/FormField'
import { Button } from '~/components/ui/button'
import { StatusButton } from '~/components/ui/status-button'
import { getAttachmentFileSrc, useIsPending } from '~/utils/misc'
import { type action } from './__car-pass-request-editor.server'

const MAX_UPLOAD_SIZE = 1024 * 1024 * 3 // 3MB

const AttachmentFieldSetSchema = z.object({
	id: z.string().optional(),
	file: z
		.instanceof(File)
		.optional()
		.refine(file => !file || file.size <= MAX_UPLOAD_SIZE, {
			message: 'File size must be less than 3MB',
		}),
	altText: z.string().optional(),
})

type AttachmentFieldSet = z.infer<typeof AttachmentFieldSetSchema>

export function attachmentHasFile(
	attachment: AttachmentFieldSet,
): attachment is AttachmentFieldSet & {
	file: NonNullable<AttachmentFieldSet['file']>
} {
	return Boolean(attachment.file?.size && attachment.file.size > 0)
}

export function attachmentHasId(
	attachment: AttachmentFieldSet,
): attachment is AttachmentFieldSet & {
	id: NonNullable<AttachmentFieldSet['id']>
} {
	return attachment.id != null
}

export const EmployeeCarPassRequestEditorSchema = z.object({
	id: z.string().optional(),
	vehicleId: z.string(),
})

export const CarPassRequestEditorSchema = z.object({
	id: z.string().optional(),
	requestNumber: z.string().optional(),
	type: z.enum(['EMPLOYEE', 'SERVICEPROVIDER']).optional().default('EMPLOYEE'),
	reason: z.enum(['NEW', 'LOST', 'DAMAGED', 'EXPIRED']),
	employeeCarPassRequest: EmployeeCarPassRequestEditorSchema.optional(),
	attachments: z.array(AttachmentFieldSetSchema).optional(),
})

export const CarPassRequestDeleteSchema = z.object({
	id: z.string(),
})

export function CarPassRequestEditor({
	carPassRequest,
	vehicles,
	title,
	intent,
	description,
}: {
	carPassRequest?: SerializeFrom<
		Pick<
			CarPassRequest,
			'id' | 'status' | 'type' | 'reason' | 'requestNumber'
		> & {
			employeeCarPassRequest: Pick<EmployeeCarPassRequest, 'vehicleId'> | null
			attachments: Array<Pick<Attachment, 'id' | 'altText'>>
		}
	>
	vehicles: SerializeFrom<
		Pick<
			Vehicle,
			| 'id'
			| 'make'
			| 'model'
			| 'year'
			| 'color'
			| 'plateNumber'
			| 'capacity'
			| 'ownership'
		>
	>[]
	title: string
	description: string
	intent: 'add' | 'edit' | 'delete'
}) {
	const params = useParams()
	const actionData = useActionData<typeof action>()
	const isPending = useIsPending()
	const disabled = intent === 'delete'
	const schema =
		intent === 'delete'
			? CarPassRequestDeleteSchema
			: CarPassRequestEditorSchema
	const [form, fields] = useForm({
		id: 'car-pass-request-form',
		constraint: getZodConstraint(schema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema })
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
		defaultValue: {
			...carPassRequest,
			type: carPassRequest?.type ?? 'EMPLOYEE',
			reason: carPassRequest?.reason ?? 'NEW',
			requestNumber: carPassRequest?.requestNumber ?? 'New',
			attachments: carPassRequest?.attachments ?? [],
		},
	})
	const attachments = fields.attachments.getFieldList()
	const employeeCarPassRequest = fields.employeeCarPassRequest.getFieldset()

	const formItems = [
		{
			field: fields.id,
			type: 'hidden' as const,
		},
		{
			label: 'Request Number',
			field: fields.requestNumber,
			type: 'text' as const,
			disabled: true,
			errors: fields.requestNumber.errors,
		},
		{
			field: fields.type,
			type: 'hidden' as const,
		},
		{
			label: 'Reason',
			field: fields.reason,
			type: 'select' as const,
			disabled,
			errors: fields.reason.errors,
			data: [
				{ name: 'New', value: 'NEW' },
				{ name: 'Lost', value: 'LOST' },
				{ name: 'Damaged', value: 'DAMAGED' },
				{ name: 'Expired', value: 'EXPIRED' },
			].map(r => ({
				name: r.name,
				value: r.value,
			})),
		},
	]

	const documents = [
		{
			type: 'EMPLOYEE',
			requirements: [
				{ description: 'Valid ID copy' },
				{ description: 'Copy of ownership Booklet' },
				{ description: 'Copy of valid vehicle inspection' },
				{ description: 'Copy valid third part insurance certificate' },
			],
		},
	]

	return (
		<FormCard
			form={form}
			title={title}
			description={description}
			intent={intent}
			encType="multipart/form-data"
			fields={[
				vehicles.length === 0 ? (
					<div
						className="bg-red-100 border border-red-200 text-red-700 p-4 rounded-md mb-4"
						key="info"
					>
						<div className="flex items-center space-x-2">
							<AlertCircleIcon className="h-4 w-4 mr-1 text-red-400" />
							{`You have not registered any vehicles. You can register a vehicle by going to your profile section.`}
						</div>
					</div>
				) : null,
				formItems.map((item, index) => <FormField key={index} item={item} />),
				fields.type.value === 'EMPLOYEE' ? (
					<div key="employeeCarPassRequest">
						<FormField
							item={{
								label: 'Vehicle',
								field: employeeCarPassRequest.vehicleId,
								type: 'select' as const,
								errors: employeeCarPassRequest.vehicleId.errors,
								data: vehicles?.map(vehicle => ({
									name: `${vehicle.make} ${vehicle.model} ${vehicle.year}`,
									value: vehicle.id,
								})),
							}}
						/>
					</div>
				) : null,

				documents
					.filter(document => document.type === fields.type.value)
					.map(document => (
						<div
							key={document.type}
							className="bg-green-50 border border-green-200 rounded-md p-4 mb-4"
						>
							<h3 className="text-sm font-semibold text-green-800 mb-2">
								<div className="flex items-center space-x-2">
									<AlertCircleIcon className="h-4 w-4 mr-1 text-red-400" />
									Required Documents for {document.type}
								</div>
							</h3>
							<ul className="text-sm list-disc pl-5 text-green-700">
								{document.requirements.map((requirement, index) => (
									<li key={index} className="mb-1">
										{requirement.description}
									</li>
								))}
							</ul>
						</div>
					)),
				<fieldset className="border p-4 rounded-md" key="attachments">
					<div className="flex space-x-4 border-b pb-2 mb-4">
						<div className="flex-1">Attachments</div>
						<div className="flex-1">
							<div
								className={
									['add', 'edit'].includes(intent)
										? 'flex items-center justify-end'
										: ''
								}
							>
								{['add', 'edit'].includes(intent) && (
									<Button
										{...form.insert.getButtonProps({
											name: fields.attachments.name,
										})}
										size="sm"
										className="ml-2"
									>
										<PlusCircle className="h-4 w-4" />
									</Button>
								)}
							</div>
						</div>
					</div>
					{attachments.map((attachment, index) => {
						return (
							<AttachmentField
								key={index}
								attachment={attachment}
								intent={intent}
								disabled={disabled}
								actions={{
									onRemove: event => {
										event.preventDefault()
										form.remove({
											name: fields.attachments.name,
											index,
										})
									},
								}}
							/>
						)
					})}
				</fieldset>,
			]}
			buttons={[
				<StatusButton
					key="submit"
					type="submit"
					disabled={isPending}
					status={isPending ? 'pending' : actionData?.result.status ?? 'idle'}
					className="w-full"
					name="intent"
					value={intent}
					variant={intent === 'delete' ? 'destructive' : 'default'}
				>
					{intent === 'delete' ? 'Delete' : 'Save'}
				</StatusButton>,
				<Button key="cancel" asChild variant="outline" className="w-full">
					<Link to={`/profile/${params.userId}/car-pass-requests`}>Cancel</Link>
				</Button>,
			]}
		/>
	)
}

export function AttachmentField({
	attachment,
	intent,
	disabled,
	actions,
}: {
	attachment: FieldMetadata<AttachmentFieldSet>
	intent: 'add' | 'edit' | 'delete'
	disabled: boolean
	actions: {
		onRemove: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void
	}
}) {
	const attachmentFields = attachment.getFieldset()
	const existingFile = Boolean(attachmentFields.id.initialValue)
	const link = getAttachmentFileSrc(attachmentFields.id.initialValue ?? '')

	return (
		<div className="flex space-x-4 items-center mb-4">
			{existingFile ? (
				<>
					<FormField
						item={{
							field: attachmentFields.id,
							type: 'hidden' as const,
						}}
					/>
					<div className="flex-1">
						<a
							href={link}
							className="flex items-center space-x-2 gap-2 font-medium text-green-600 hover:text-green-500"
						>
							<PaperclipIcon className="h-4 w-4" />
							{attachmentFields.altText.initialValue}
						</a>
					</div>
				</>
			) : (
				<div className="flex-1">
					<FormField
						item={{
							field: attachmentFields.file,
							type: 'file' as const,
							disabled,
							errors: attachmentFields.file.errors,
							addon:
								intent === 'delete' ? null : (
									<Button
										onClick={actions.onRemove}
										variant="destructive"
										size="sm"
										className="ml-2"
									>
										<TrashIcon className="h-4 w-4" />
									</Button>
								),
						}}
					/>
				</div>
			)}
		</div>
	)
}
