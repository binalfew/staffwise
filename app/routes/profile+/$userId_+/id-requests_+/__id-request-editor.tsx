import { FieldMetadata, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import {
	Attachment,
	Dependant,
	DependantIdRequest,
	EmployeeIdRequest,
	IdRequest,
	PrivateDriverIdRequest,
	Spouse,
	SpouseIdRequest,
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
import { type action } from './__id-request-editor.server'

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

export const EmployeeIdRequestEditorSchema = z.object({
	id: z.string().optional(),
	contractExpiryDate: z
		.date({
			required_error: 'Contract expiry date is required',
			invalid_type_error: 'Invalid contract expiry date',
		})
		.min(new Date(), { message: 'Contract expiry date cannot be in the past' }),
})

export const DependantIdRequestEditorSchema = z.object({
	id: z.string().optional(),
	dependantId: z.string(),
})

export const SpouseIdRequestEditorSchema = z.object({
	id: z.string().optional(),
	spouseId: z.string(),
})

export const PrivateDriverIdRequestEditorSchema = z.object({
	id: z.string().optional(),
	staffAuIdNumber: z.string().optional(),
	driverFullName: z.string(),
	driverIdNumber: z.string(),
	title: z.string(),
	driverPhoneNumber: z.string(),
	gender: z.string(),
	nationality: z.string(),
})

export const IdRequestEditorSchema = z.object({
	id: z.string().optional(),
	requestNumber: z.string().optional(),
	type: z.enum(['EMPLOYEE', 'SPOUSE', 'DEPENDANT', 'PRIVATEDRIVER']),
	reason: z.enum(['NEW', 'LOST', 'DAMAGED', 'EXPIRED']),
	employeeIdRequest: EmployeeIdRequestEditorSchema.optional(),
	spouseIdRequest: SpouseIdRequestEditorSchema.optional(),
	dependantIdRequest: DependantIdRequestEditorSchema.optional(),
	privateDriverIdRequest: PrivateDriverIdRequestEditorSchema.optional(),
	attachments: z.array(AttachmentFieldSetSchema).optional(),
})

export const IdRequestDeleteSchema = z.object({
	id: z.string(),
})

export function IdRequestEditor({
	idRequest,
	spouses,
	dependants,
	title,
	intent,
	description,
}: {
	idRequest?: SerializeFrom<
		Pick<IdRequest, 'id' | 'status' | 'type' | 'reason' | 'requestNumber'> & {
			employeeIdRequest: Pick<EmployeeIdRequest, 'contractExpiryDate'> | null
			spouseIdRequest: Pick<SpouseIdRequest, 'spouseId'> | null
			dependantIdRequest: Pick<DependantIdRequest, 'dependantId'> | null
			privateDriverIdRequest: Pick<
				PrivateDriverIdRequest,
				| 'driverFullName'
				| 'staffAuIdNumber'
				| 'driverIdNumber'
				| 'title'
				| 'driverPhoneNumber'
				| 'gender'
				| 'nationality'
			> | null
			attachments: Array<Pick<Attachment, 'id' | 'altText'>>
		}
	>
	spouses: SerializeFrom<
		Pick<Spouse, 'id' | 'firstName' | 'middleName' | 'familyName'>
	>[]
	dependants: SerializeFrom<
		Pick<Dependant, 'id' | 'firstName' | 'middleName' | 'familyName'>
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
		intent === 'delete' ? IdRequestDeleteSchema : IdRequestEditorSchema
	const [form, fields] = useForm({
		id: 'id-request-form',
		constraint: getZodConstraint(schema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema })
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
		defaultValue: {
			...idRequest,
			type: idRequest?.type ?? 'EMPLOYEE',
			reason: idRequest?.reason ?? 'NEW',
			requestNumber: idRequest?.requestNumber ?? 'New',
			attachments: idRequest?.attachments ?? [],
		},
	})
	const attachments = fields.attachments.getFieldList()
	const employeeIdRequest = fields.employeeIdRequest.getFieldset()
	const dependantIdRequest = fields.dependantIdRequest.getFieldset()
	const spouseIdRequest = fields.spouseIdRequest.getFieldset()
	const privateDriverIdRequest = fields.privateDriverIdRequest.getFieldset()

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
			label: 'ID Request For',
			field: fields.type,
			disabled,
			errors: fields.type.errors,
			type: ['add', 'delete'].includes(intent)
				? ('select' as const)
				: ('hidden' as const),
			data: [
				{ name: 'EMPLOYEE', value: 'EMPLOYEE' },
				{ name: 'SPOUSE', value: 'SPOUSE' },
				{ name: 'DEPENDANT', value: 'DEPENDANT' },
				{ name: 'PRIVATE DRIVER', value: 'PRIVATEDRIVER' },
			].map(t => ({
				name: t.name,
				value: t.value,
			})),
		},
		{
			label: 'Reason',
			field: fields.reason,
			type: 'select' as const,
			disabled,
			errors: fields.reason.errors,
			data: [
				{ name: 'NEW', value: 'NEW' },
				{ name: 'LOST', value: 'LOST' },
				{ name: 'DAMAGED', value: 'DAMAGED' },
				{ name: 'EXPIRED', value: 'EXPIRED' },
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
				{
					description: 'Attach contract with SAP no. from AHRM',
				},
				{
					description: 'Attach Copy of Passport/Resident ID',
				},
			],
		},
		{
			type: 'SPOUSE',
			requirements: [
				{
					description: 'Attach spouse’s passport/resident ID',
				},
			],
		},
		{
			type: 'DEPENDANT',
			requirements: [
				{
					description: 'Filling application form by concerned staff member',
				},
				{
					description: 'Copy of marriage certificate for spouse and',
				},
				{
					description: 'Birth certificate for children (14-24)',
				},
			],
		},
		{
			type: 'PRIVATEDRIVER',
			requirements: [
				{
					description:
						'Filling of the application form by concerned staff member',
				},
				{
					description:
						'Copy employment agreement letter between the staff and the driver',
				},
				{
					description: 'Certificate of good conduct from police',
				},
				{
					description: 'Copy of valid driving license',
				},
				{
					description: 'Copy of valid passport/Resident ID',
				},
			],
		},
	]

	if (['LOST', 'DAMAGED'].includes(fields.reason.value ?? '')) {
		documents.map(document => {
			document.requirements.push({
				description: 'Request letter from the staff with detailed information',
			})
			document.requirements.push({
				description: 'Approval letter from OSSS',
			})
			document.requirements.push({
				description: 'Payment receipt',
			})
		})
	}

	return (
		<FormCard
			form={form}
			title={title}
			description={description}
			intent={intent}
			encType="multipart/form-data"
			fields={[
				['SPOUSE', 'DEPENDANT'].includes(fields.type.value ?? '') &&
				spouses.length === 0 ? (
					<div
						className="bg-red-100 border border-red-200 text-red-700 p-4 rounded-md mb-4"
						key="info"
					>
						<div className="flex items-center space-x-2">
							<AlertCircleIcon className="h-4 w-4 mr-1 text-red-400" />
							{`You have not registered any ${
								fields.type.value === 'SPOUSE' ? 'spouses' : 'dependants'
							}. You can register ${
								fields.type.value === 'SPOUSE' ? 'a spouse' : 'a dependant'
							} by going to your profile section.`}
						</div>
					</div>
				) : null,
				formItems.map((item, index) => <FormField key={index} item={item} />),
				fields.type.value === 'EMPLOYEE' ? (
					<div key="employeeIdRequest">
						<FormField
							item={{
								label: 'Contract Expire Date',
								field: employeeIdRequest.contractExpiryDate,
								type: 'date' as const,
								disabled,
								errors: employeeIdRequest.contractExpiryDate.errors,
							}}
						/>
					</div>
				) : null,
				fields.type.value === 'SPOUSE' ? (
					<div key="spouseIdRequest">
						<FormField
							item={{
								label: 'Spouse',
								field: spouseIdRequest.spouseId,
								type: 'select' as const,
								errors: spouseIdRequest.spouseId.errors,
								data: spouses?.map(spouse => ({
									name: `${spouse.firstName} ${spouse.middleName} ${spouse.familyName}`,
									value: spouse.id,
								})),
							}}
						/>
					</div>
				) : null,

				fields.type.value === 'DEPENDANT' ? (
					<div key="dependantIdRequest">
						<FormField
							item={{
								label: 'Dependant',
								field: dependantIdRequest.dependantId,
								type: 'select' as const,
								errors: dependantIdRequest.dependantId.errors,
								data: dependants?.map(dependant => ({
									name: `${dependant.firstName} ${dependant.middleName} ${dependant.familyName}`,
									value: dependant.id,
								})),
							}}
						/>
					</div>
				) : null,
				fields.type.value === 'PRIVATEDRIVER' ? (
					<div key="privateDriverIdRequest" className="flex flex-col gap-4">
						<FormField
							item={{
								label: 'Driver Full Name',
								field: privateDriverIdRequest.driverFullName,
								type: 'text' as const,
								disabled,
								errors: privateDriverIdRequest.driverFullName.errors,
							}}
						/>
						<FormField
							item={{
								label: 'Driver ID Number',
								field: privateDriverIdRequest.driverIdNumber,
								type: 'text' as const,
								disabled,
								errors: privateDriverIdRequest.driverIdNumber.errors,
							}}
						/>
						<FormField
							item={{
								label: 'Title',
								field: privateDriverIdRequest.title,
								type: 'text' as const,
								disabled,
								errors: privateDriverIdRequest.title.errors,
							}}
						/>
						<FormField
							item={{
								label: 'Driver Phone Number',
								field: privateDriverIdRequest.driverPhoneNumber,
								type: 'text' as const,
								disabled,
								errors: privateDriverIdRequest.driverPhoneNumber.errors,
							}}
						/>
						<FormField
							item={{
								label: 'Gender',
								field: privateDriverIdRequest.gender,
								type: 'text' as const,
								disabled,
								errors: privateDriverIdRequest.gender.errors,
							}}
						/>
						<FormField
							item={{
								label: 'Nationality',
								field: privateDriverIdRequest.nationality,
								type: 'text' as const,
								disabled,
								errors: privateDriverIdRequest.nationality.errors,
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
					<Link to={`/profile/${params.userId}/id-requests`}>Cancel</Link>
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
