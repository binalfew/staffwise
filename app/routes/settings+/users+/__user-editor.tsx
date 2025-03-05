import { getFormProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { Role, User } from '@prisma/client'
import { SerializeFrom } from '@remix-run/node'
import { Form, Link, useActionData } from '@remix-run/react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { Field, FieldError } from '~/components/Field'
import { CheckboxGroupField } from '~/components/conform/CheckboxGroupField'
import { InputField } from '~/components/conform/InputField'
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
import { type action } from './__user-editor.server'

export const UserEditorSchema = z.object({
	id: z.string().optional(),
	name: z.string({ required_error: 'Name is required' }),
	email: z.string({ required_error: 'Email is required' }),
	username: z.string({ required_error: 'Username is required' }),
	roles: z
		.array(z.string())
		.min(1, { message: 'At least one role is required' }),
})

export const UserDeleteSchema = z.object({
	id: z.string(),
})

export function UserEditor({
	user,
	roles,
	title,
	intent,
}: {
	user?: SerializeFrom<
		Pick<User, 'id' | 'name' | 'email' | 'username'> & {
			roles?: Array<Pick<Role, 'id' | 'name'>>
		}
	>
	roles: Array<Pick<Role, 'id' | 'name'>>
	title: string
	intent?: 'add' | 'edit' | 'delete'
}) {
	const actionData = useActionData<typeof action>()
	const disabled = intent === 'delete'
	const schema = intent === 'delete' ? UserDeleteSchema : UserEditorSchema
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
			...user,
			roles: user?.roles?.map(role => role.id) ?? [],
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
						<Field>
							<Label htmlFor={fields.name.id}>Name</Label>
							<InputField
								meta={fields.name}
								type="text"
								autoComplete="off"
								disabled={disabled}
							/>
							{fields.name.errors && (
								<FieldError>{fields.name.errors}</FieldError>
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
							<Label htmlFor={fields.username.id}>Username</Label>
							<InputField
								meta={fields.username}
								type="text"
								autoComplete="off"
								disabled={disabled}
							/>
							{fields.username.errors && (
								<FieldError>{fields.username.errors}</FieldError>
							)}
						</Field>

						<Field>
							<fieldset>
								<legend>Roles</legend>
							</fieldset>
							<CheckboxGroupField
								meta={fields.roles}
								items={roles?.map(role => ({
									name: role.name,
									value: role.id,
								}))}
							/>
							{fields.roles.errors && (
								<FieldError>{fields.roles.errors}</FieldError>
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
							<Link to="/settings/users">Cancel</Link>
						</Button>
					</div>
				</CardFooter>
			</Card>
		</div>
	)
}
