import { getFormProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { Employee, Officer } from '@prisma/client'
import { SerializeFrom } from '@remix-run/node'
import { Form, Link, useActionData } from '@remix-run/react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { Field, FieldError } from '~/components/Field'
import { CheckboxField } from '~/components/conform/CheckboxField'
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
import { type action } from './__officer-editor.server'

export const OfficerEditorSchema = z.object({
	id: z.string().optional(),
	email: z.string({ required_error: 'Email is required' }),
	employeeId: z.string().optional(),
	auIdNumber: z.string().optional(),
	firstName: z.string().optional(),
	middleName: z.string().optional(),
	type: z.enum(['ID', 'INCIDENT', 'CARPASS', 'ACCESS', 'PARKING']),
	isActive: z.boolean().optional(),
})

export const OfficerDeleteSchema = z.object({
	id: z.string(),
})

export function OfficerEditor({
	officer,
	title,
	intent,
}: {
	officer?: SerializeFrom<
		Pick<Officer, 'id' | 'employeeId' | 'isActive' | 'type'> & {
			employee: Pick<
				Employee,
				'id' | 'auIdNumber' | 'firstName' | 'middleName' | 'email'
			>
		}
	>
	title: string
	intent?: 'add' | 'edit' | 'delete'
}) {
	const actionData = useActionData<typeof action>()
	const disabled = intent === 'delete'
	const schema = intent === 'delete' ? OfficerDeleteSchema : OfficerEditorSchema
	const [form, fields] = useForm({
		id: 'register-user',
		constraint: getZodConstraint(schema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema })
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
		defaultValue: {
			...officer,
			email: officer?.employee?.email,
			auIdNumber: officer?.employee?.auIdNumber,
			firstName: officer?.employee?.firstName,
			middleName: officer?.employee?.middleName,
		},
	})

	return (
		<div className="flex flex-col gap-8">
			<Card className="w-full">
				<CardHeader>
					<CardTitle>{title}</CardTitle>
					{intent === 'delete' && (
						<CardDescription className="text-red-500 py-2">
							Are you sure you want to delete this user? This action cannot be
							undone.
						</CardDescription>
					)}
				</CardHeader>
				<CardContent>
					<Form className="grid gap-4" method="POST" {...getFormProps(form)}>
						<AuthenticityTokenInput />
						<HoneypotInputs />
						<InputField meta={fields.id} type="hidden" />
						<InputField meta={fields.employeeId} type="hidden" />

						{(intent === 'edit' || intent === 'delete') && (
							<>
								<Field>
									<Label htmlFor={fields.auIdNumber.id}>AU ID Number</Label>
									<InputField meta={fields.auIdNumber} type="text" disabled />
								</Field>

								<Field>
									<Label htmlFor={fields.firstName.id}>First Name</Label>
									<InputField meta={fields.firstName} type="text" disabled />
								</Field>

								<Field>
									<Label htmlFor={fields.middleName.id}>Middle Name</Label>
									<InputField meta={fields.middleName} type="text" disabled />
								</Field>
							</>
						)}

						<Field>
							<Label htmlFor={fields.type.id}>Officer Type</Label>
							<SelectField
								meta={fields.type}
								items={['ID', 'INCIDENT', 'CARPASS', 'ACCESS', 'PARKING'].map(
									type => ({
										name: type,
										value: type,
									}),
								)}
								placeholder="Select"
								disabled={disabled}
							/>
							{fields.type.errors && (
								<FieldError>{fields.type.errors}</FieldError>
							)}
						</Field>

						<Field>
							<Label htmlFor={fields.email.id}>Email</Label>
							<InputField
								meta={fields.email}
								type="text"
								autoComplete="off"
								disabled={disabled}
							/>
							{fields.email.errors && (
								<FieldError>{fields.email.errors}</FieldError>
							)}
						</Field>

						<Field>
							<Label htmlFor={fields.isActive.id}>Is Active</Label>
							<CheckboxField meta={fields.isActive} disabled={disabled} />
							{fields.isActive.errors && (
								<FieldError>{fields.isActive.errors}</FieldError>
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
							<Link to="/settings/officers">Cancel</Link>
						</Button>
					</div>
				</CardFooter>
			</Card>
		</div>
	)
}
