import { getFormProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { Permission, Role } from '@prisma/client'
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
import { type action } from './__role-editor.server'

export const RoleEditorSchema = z.object({
	id: z.string().optional(),
	name: z.string({ required_error: 'Name is required' }),
	description: z.string({ required_error: 'Description is required' }),
	permissions: z
		.array(z.string())
		.min(1, { message: 'At least one permission is required' }),
})

export const RoleDeleteSchema = z.object({
	id: z.string(),
})

export function RoleEditor({
	role,
	permissions,
	title,
	intent,
}: {
	role?: SerializeFrom<
		Pick<Role, 'id' | 'name' | 'description'> & {
			permissions?: Array<
				Pick<Permission, 'id' | 'entity' | 'action' | 'access'>
			>
		}
	>
	permissions: Array<Pick<Permission, 'id' | 'entity' | 'action' | 'access'>>
	title: string
	intent?: 'add' | 'edit' | 'delete'
}) {
	const actionData = useActionData<typeof action>()
	const disabled = intent === 'delete'
	const schema = intent === 'delete' ? RoleDeleteSchema : RoleEditorSchema
	const [form, fields] = useForm({
		id: 'register-role',
		constraint: getZodConstraint(schema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema })
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
		defaultValue: {
			...role,
			permissions: role?.permissions?.map(permission => permission.id) ?? [],
		},
	})

	return (
		<div className="flex flex-col gap-8">
			<Card className="w-full">
				<CardHeader>
					<CardTitle>{title}</CardTitle>
					{intent === 'delete' && (
						<CardDescription className="text-red-500 py-2">
							Are you sure you want to delete this role? This action cannot be
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
							<Label htmlFor={fields.description.id}>Description</Label>
							<InputField
								meta={fields.description}
								type="text"
								autoComplete="off"
								disabled={disabled}
							/>
							{fields.description.errors && (
								<FieldError>{fields.description.errors}</FieldError>
							)}
						</Field>

						<Field>
							<fieldset>
								<legend>Permissions</legend>
							</fieldset>
							<CheckboxGroupField
								meta={fields.permissions}
								items={permissions.map(permission => ({
									name: permission.entity,
									value: permission.id,
									access: permission.access,
									action: permission.action,
								}))}
							/>
							{fields.permissions.errors && (
								<FieldError>{fields.permissions.errors}</FieldError>
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
							<Link to="/settings/roles">Cancel</Link>
						</Button>
					</div>
				</CardFooter>
			</Card>
		</div>
	)
}
