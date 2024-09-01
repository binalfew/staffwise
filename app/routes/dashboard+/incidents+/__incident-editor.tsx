import { FieldMetadata, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { Attachment, Incident, IncidentType } from '@prisma/client'
import { SerializeFrom } from '@remix-run/node'
import { Link, useActionData, useParams } from '@remix-run/react'
import { PaperclipIcon, PlusCircle, TrashIcon } from 'lucide-react'
import { z } from 'zod'
import FormCard from '~/components/FormCard'
import FormField from '~/components/FormField'
import { Button } from '~/components/ui/button'
import { StatusButton } from '~/components/ui/status-button'
import { getAttachmentFileSrc, useIsPending } from '~/utils/misc'
import { type action } from './__incident-editor.server'

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

export const IncidentEditorSchema = z.object({
	id: z.string().optional(),
	email: z.string({ required_error: 'Email is required' }),
	incidentNumber: z.string().optional(),
	incidentTypeId: z.string({ required_error: 'Incident Type is required' }),
	location: z.string({ required_error: 'Location is required' }),
	severity: z.string({ required_error: 'Severity is required' }),
	description: z.string({ required_error: 'Description is required' }),
	eyeWitnesses: z.string({ required_error: 'Eye Witnesses is required' }),
	occuredWhile: z.string({ required_error: 'Occured While is required' }),
	occuredAt: z.date({ required_error: 'Incident Date is required' }),
	timeOfDay: z.string({ required_error: 'Incident Time is required' }),
	attachments: z.array(AttachmentFieldSetSchema).optional(),
})

export const IncidentDeleteSchema = z.object({
	id: z.string(),
})

export function IncidentEditor({
	incident,
	incidentTypes,
	title,
	description,
	intent,
}: {
	incident?: SerializeFrom<
		Pick<
			Incident,
			| 'id'
			| 'employeeId'
			| 'incidentNumber'
			| 'incidentTypeId'
			| 'location'
			| 'description'
			| 'eyeWitnesses'
			| 'occuredWhile'
			| 'occuredAt'
			| 'timeOfDay'
			| 'severity'
		> & {
			attachments: Array<Pick<Attachment, 'id' | 'altText'>>
		}
	>
	incidentTypes: SerializeFrom<Pick<IncidentType, 'id' | 'name'>>[]
	title: string
	description: string
	intent: 'add' | 'edit' | 'delete'
}) {
	const params = useParams()
	const actionData = useActionData<typeof action>()
	const isPending = useIsPending()
	const disabled = intent === 'delete'
	const schema =
		intent === 'delete' ? IncidentDeleteSchema : IncidentEditorSchema
	const [form, fields] = useForm({
		id: 'register-incident',
		constraint: getZodConstraint(schema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema })
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
		defaultValue: {
			...incident,
			incidentNumber: incident?.incidentNumber ?? 'New',
			occuredAt: incident?.occuredAt ?? new Date(),
			timeOfDay: incident?.timeOfDay ?? new Date().toTimeString().slice(0, 5),
			attachments: incident?.attachments ?? [],
		},
	})

	const attachments = fields.attachments.getFieldList()

	const formItems = [
		{
			type: 'hidden' as const,
			field: fields.id,
		},
		{
			label: 'Email',
			field: fields.email,
			disabled,
			errors: fields.email.errors,
			type: 'text' as const,
		},
		{
			label: 'Incident Number',
			field: fields.incidentNumber,
			disabled: true,
			errors: fields.incidentNumber.errors,
			type: 'text' as const,
		},
		{
			label: 'Incident Type',
			field: fields.incidentTypeId,
			disabled,
			errors: fields.incidentTypeId.errors,
			type: 'select' as const,
			data: incidentTypes.map(incidentType => ({
				name: incidentType.name,
				value: incidentType.id,
			})),
		},
		{
			label: 'Severity',
			field: fields.severity,
			disabled,
			errors: fields.severity.errors,
			type: 'select' as const,
			data: [
				{ name: 'Minor', value: 'minor' },
				{ name: 'Major', value: 'major' },
				{ name: 'Critical', value: 'critical' },
			],
		},
		{
			label: 'Specific Location',
			field: fields.location,
			disabled,
			errors: fields.location.errors,
			type: 'text' as const,
		},
		{
			label: 'Occured While',
			field: fields.occuredWhile,
			disabled,
			errors: fields.occuredWhile.errors,
			type: 'text' as const,
		},
		{
			label: 'Incident Date',
			field: fields.occuredAt,
			disabled,
			errors: fields.occuredAt.errors,
			type: 'date' as const,
		},
		{
			label: 'Incident Time',
			field: fields.timeOfDay,
			disabled,
			errors: fields.timeOfDay.errors,
			type: 'time' as const,
		},
		{
			label: 'Incident Details',
			field: fields.description,
			disabled,
			errors: fields.description.errors,
			type: 'textarea' as const,
		},
		{
			label: 'Eye Witnesses',
			field: fields.eyeWitnesses,
			disabled,
			errors: fields.eyeWitnesses.errors,
			type: 'text' as const,
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
				<fieldset className="border p-4 rounded-md" key="incident">
					<legend className="text-md px-2 font-semibold text-gray-500">
						Incident
					</legend>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{formItems.map((item, index) => (
							<div
								key={index}
								className={
									[
										'Email',
										'Incident Details',
										'Incident Type',
										'Incident Number',
										'Severity',
										'Eye Witnesses',
									].includes(item.label ?? '')
										? 'col-span-1 md:col-span-2'
										: ''
								}
							>
								<FormField item={item} />
							</div>
						))}
					</div>
				</fieldset>,

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
					form={form.id}
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
					<Link to={`/dashboard/incidents`}>Cancel</Link>
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
						}}
					/>
				</div>
			)}
			{intent === 'delete' ? null : (
				<Button onClick={actions.onRemove} variant="destructive" size="sm">
					<TrashIcon className="h-4 w-4" />
				</Button>
			)}
		</div>
	)
}
