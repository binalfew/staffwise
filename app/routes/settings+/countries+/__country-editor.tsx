import { getFormProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { Country } from '@prisma/client'
import { SerializeFrom } from '@remix-run/node'
import { Form, Link, useActionData } from '@remix-run/react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { Field, FieldError } from '~/components/Field'
import { CheckboxField } from '~/components/conform/CheckboxField'
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
import { type action } from './__country-editor.server'

export const CountryEditorSchema = z.object({
	id: z.string().optional(),
	name: z.string({ required_error: 'Name is required' }),
	code: z.string({ required_error: 'Code is required' }),
	isMemberState: z.boolean().default(false),
})

export const CountryDeleteSchema = z.object({
	id: z.string(),
})

export function CountryEditor({
	country,
	title,
	intent,
}: {
	country?: SerializeFrom<
		Pick<Country, 'id' | 'name' | 'code' | 'isMemberState'>
	>
	title: string
	intent?: 'add' | 'edit' | 'delete'
}) {
	const actionData = useActionData<typeof action>()
	const disabled = intent === 'delete'
	const schema = intent === 'delete' ? CountryDeleteSchema : CountryEditorSchema
	const [form, fields] = useForm({
		id: 'register-country',
		constraint: getZodConstraint(schema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema })
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
		defaultValue: country,
	})

	return (
		<div className="flex flex-col gap-8">
			<Card className="w-full">
				<CardHeader>
					<CardTitle>{title}</CardTitle>
					{intent === 'delete' && (
						<CardDescription className="text-red-500 py-2">
							Are you sure you want to delete this country? This action cannot
							be undone.
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
							<Label htmlFor={fields.code.id}>Code</Label>
							<InputField
								meta={fields.code}
								type="text"
								autoComplete="off"
								disabled={disabled}
							/>
							{fields.code.errors && (
								<FieldError>{fields.code.errors}</FieldError>
							)}
						</Field>

						<Field>
							<div className="flex items-center gap-2">
								<CheckboxField
									meta={fields.isMemberState}
									disabled={disabled}
								/>
								<Label htmlFor={fields.isMemberState.id}>Is Member State</Label>
							</div>
							{fields.isMemberState.errors && (
								<FieldError>{fields.isMemberState.errors}</FieldError>
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
							<Link to="/settings/countries">Cancel</Link>
						</Button>
					</div>
				</CardFooter>
			</Card>
		</div>
	)
}
