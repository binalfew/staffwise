import { getFormProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { Permission } from '@prisma/client'
import { SerializeFrom } from '@remix-run/node'
import { Form, Link, useActionData } from '@remix-run/react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { Field, FieldError } from '~/components/Field'
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
import { type action } from './__permission-editor.server'

export const PermissionEditorSchema = z.object({
	id: z.string().optional(),
	entity: z.string({ required_error: 'Entity is required' }),
	action: z.string({ required_error: 'Action is required' }),
	access: z.string({ required_error: 'Access is required' }),
	description: z.string().optional(),
})

export const PermissionDeleteSchema = z.object({
	id: z.string(),
})

export function PermissionEditor({
	permission,
	title,
	intent,
}: {
	permission?: SerializeFrom<
		Pick<Permission, 'id' | 'entity' | 'action' | 'access' | 'description'>
	>
	title: string
	intent?: 'add' | 'edit' | 'delete'
}) {
	const actionData = useActionData<typeof action>()
	const disabled = intent === 'delete'
	const schema =
		intent === 'delete' ? PermissionDeleteSchema : PermissionEditorSchema
	const [form, fields] = useForm({
		id: 'register-permission',
		constraint: getZodConstraint(schema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema })
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
		defaultValue: permission,
	})

	return (
		<div className="flex flex-col gap-8">
			<Card className="w-full">
				<CardHeader>
					<CardTitle>{title}</CardTitle>
					{intent === 'delete' && (
						<CardDescription className="text-red-500 py-2">
							Are you sure you want to delete this permission? This action
							cannot be undone.
						</CardDescription>
					)}
				</CardHeader>
				<CardContent>
					<Form className="grid gap-4" method="POST" {...getFormProps(form)}>
						<AuthenticityTokenInput />
						<HoneypotInputs />
						<InputField meta={fields.id} type="hidden" />
						<Field>
							<Label htmlFor={fields.entity.id}>Entity</Label>
							<InputField
								meta={fields.entity}
								type="text"
								autoComplete="off"
								disabled={disabled}
							/>
							{fields.entity.errors && (
								<FieldError>{fields.entity.errors}</FieldError>
							)}
						</Field>

						<Field>
							<Label htmlFor={fields.action.id}>Action</Label>
							<InputField
								meta={fields.action}
								type="text"
								autoComplete="off"
								disabled={disabled}
							/>
							{fields.action.errors && (
								<FieldError>{fields.action.errors}</FieldError>
							)}
						</Field>

						<Field>
							<Label htmlFor={fields.access.id}>Access</Label>
							<InputField
								meta={fields.access}
								type="text"
								autoComplete="off"
								disabled={disabled}
							/>
							{fields.access.errors && (
								<FieldError>{fields.access.errors}</FieldError>
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
							<Link to="/settings/permissions">Cancel</Link>
						</Button>
					</div>
				</CardFooter>
			</Card>
		</div>
	)
}
