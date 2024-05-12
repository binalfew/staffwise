import { getFormProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { Dependant } from '@prisma/client'
import { SerializeFrom } from '@remix-run/node'
import { Form, Link, useActionData, useParams } from '@remix-run/react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { Field, FieldError } from '~/components/Field'
import { DatePickerField } from '~/components/conform/DatePickerField'
import { InputField } from '~/components/conform/InputField'
import { SelectField } from '~/components/conform/SelectField'
import { Button } from '~/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '~/components/ui/card'
import { Label } from '~/components/ui/label'
import { Separator } from '~/components/ui/separator'
import { type action } from './__dependant-editor.server'

export const DependantEditorSchema = z.object({
	id: z.string().optional(),
	firstName: z.string({ required_error: 'First Name is required' }),
	familyName: z.string({ required_error: 'Family Name is required' }),
	middleName: z.string().optional(),
	auIdNumber: z.string({ required_error: 'AU ID Number is required' }),
	dateIssued: z.date({ required_error: 'Date Issued is required' }),
	validUntil: z.date({ required_error: 'Valid Until is required' }),
	dateOfBirth: z.date({ required_error: 'Date of Birth is required' }),
	relationshipId: z.string({ required_error: 'Relationship is required' }),
	nameOfSchool: z
		.string({ required_error: 'Name of School is required' })
		.optional(),
})

export const DependantDeleteSchema = z.object({
	id: z.string(),
})

export function DependantEditor({
	dependant,
	relationships,
	title,
	intent,
}: {
	dependant?: SerializeFrom<
		Pick<
			Dependant,
			| 'id'
			| 'firstName'
			| 'familyName'
			| 'middleName'
			| 'auIdNumber'
			| 'dateIssued'
			| 'validUntil'
			| 'dateOfBirth'
			| 'relationshipId'
			| 'nameOfSchool'
		>
	>
	relationships: Array<{ id: string; name: string }>
	title: string
	intent?: 'add' | 'edit' | 'delete'
}) {
	const params = useParams()
	const actionData = useActionData<typeof action>()
	const disabled = intent === 'delete'
	const schema =
		intent === 'delete' ? DependantDeleteSchema : DependantEditorSchema
	const [form, fields] = useForm({
		id: 'dependant-form',
		constraint: getZodConstraint(schema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema })
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
		defaultValue: dependant || {},
	})

	return (
		<div className="flex flex-col gap-8">
			<Card className="mx-auto w-full max-w-5xl space-y-6 py-2">
				<CardHeader>
					<CardTitle>{title}</CardTitle>
					{intent === 'delete' && (
						<CardDescription className="text-red-500 py-2">
							Are you sure you want to delete this dependant? This action cannot
							be undone.
						</CardDescription>
					)}
				</CardHeader>
				<Separator className="mb-1" />
				<CardContent>
					<Form className="grid gap-4" method="POST" {...getFormProps(form)}>
						<AuthenticityTokenInput />
						<HoneypotInputs />
						<InputField meta={fields.id} type="hidden" />
						{/* Repeat this structure for each field similar to the provided example */}
						<Field>
							<Label
								htmlFor={fields.firstName.id}
								className={disabled ? 'text-muted-foreground' : ''}
							>
								First Name
							</Label>
							<InputField
								meta={fields.firstName}
								type="text"
								disabled={disabled}
							/>
							{fields.firstName.errors && (
								<FieldError>{fields.firstName.errors}</FieldError>
							)}
						</Field>

						<Field>
							<Label
								htmlFor={fields.familyName.id}
								className={disabled ? 'text-muted-foreground' : ''}
							>
								Family Name
							</Label>
							<InputField
								meta={fields.familyName}
								type="text"
								disabled={disabled}
							/>
							{fields.familyName.errors && (
								<FieldError>{fields.familyName.errors}</FieldError>
							)}
						</Field>

						<Field>
							<Label
								htmlFor={fields.middleName.id}
								className={disabled ? 'text-muted-foreground' : ''}
							>
								Middle Name
							</Label>
							<InputField
								meta={fields.middleName}
								type="text"
								disabled={disabled}
							/>
							{fields.middleName.errors && (
								<FieldError>{fields.middleName.errors}</FieldError>
							)}
						</Field>
						<Field>
							<Label
								htmlFor={fields.auIdNumber.id}
								className={disabled ? 'text-muted-foreground' : ''}
							>
								AU ID Number
							</Label>
							<InputField
								meta={fields.auIdNumber}
								type="text"
								disabled={disabled}
							/>
							{fields.auIdNumber.errors && (
								<FieldError>{fields.auIdNumber.errors}</FieldError>
							)}
						</Field>

						<Field>
							<Label
								htmlFor={fields.dateIssued.id}
								className={disabled ? 'text-muted-foreground' : ''}
							>
								Date Issued
							</Label>
							<DatePickerField meta={fields.dateIssued} />
							{fields.dateIssued.errors && (
								<FieldError>{fields.dateIssued.errors}</FieldError>
							)}
						</Field>

						<Field>
							<Label
								htmlFor={fields.validUntil.id}
								className={disabled ? 'text-muted-foreground' : ''}
							>
								Valid Until
							</Label>
							<DatePickerField meta={fields.validUntil} />
							{fields.validUntil.errors && (
								<FieldError>{fields.validUntil.errors}</FieldError>
							)}
						</Field>

						<Field>
							<Label
								htmlFor={fields.dateOfBirth.id}
								className={disabled ? 'text-muted-foreground' : ''}
							>
								Valid Until
							</Label>
							<DatePickerField meta={fields.dateOfBirth} />
							{fields.dateOfBirth.errors && (
								<FieldError>{fields.dateOfBirth.errors}</FieldError>
							)}
						</Field>

						<Field>
							<Label htmlFor={fields.relationshipId.id}>Relationship</Label>
							<SelectField
								meta={fields.relationshipId}
								items={relationships.map(r => ({ name: r.name, value: r.id }))}
								placeholder="Select Relationship"
								disabled={disabled}
							/>
							{fields.relationshipId.errors && (
								<FieldError>{fields.relationshipId.errors}</FieldError>
							)}
						</Field>
						<Field>
							<Label htmlFor={fields.nameOfSchool.id}>Name of School</Label>
							<InputField
								meta={fields.nameOfSchool}
								type="text"
								disabled={disabled}
							/>
							{fields.nameOfSchool.errors && (
								<FieldError>{fields.nameOfSchool.errors}</FieldError>
							)}
						</Field>
					</Form>
				</CardContent>
				<CardFooter className="border-t px-6 py-4">
					<div className="flex items-center justify-end space-x-2">
						<Button
							type="submit"
							form={form.id}
							name="intent"
							value={intent}
							variant={intent === 'delete' ? 'destructive' : 'default'}
						>
							{intent === 'delete' ? 'Delete' : 'Save'}
						</Button>
						<Button asChild variant="outline">
							<Link to={`/profile/${params.userId}/dependants`}>Cancel</Link>
						</Button>
					</div>
				</CardFooter>
			</Card>
		</div>
	)
}
