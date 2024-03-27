import { getFormProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { Country, Organ } from '@prisma/client'
import { SerializeFrom } from '@remix-run/node'
import { Form, Link, useActionData } from '@remix-run/react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { Field, FieldError } from '~/components/Field'
import { InputField } from '~/components/conform/InputField'
import { SelectField } from '~/components/conform/SelectField' // Assuming you have a SelectField component
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
import { type action } from './__organ-editor.server' // Adjust import paths as necessary

export const OrganEditorSchema = z.object({
	id: z.string().optional(),
	name: z.string({ required_error: 'Name is required' }),
	code: z.string({ required_error: 'Code is required' }),
	address: z.string({ required_error: 'Address is required' }),
	countryId: z.string({ required_error: 'Country is required' }),
})

export const OrganDeleteSchema = z.object({
	id: z.string(),
})

export function OrganEditor({
	organ,
	countries,
	title,
	intent,
}: {
	organ?: SerializeFrom<
		Pick<Organ, 'id' | 'name' | 'code' | 'address' | 'countryId'>
	>
	countries: Array<Pick<Country, 'id' | 'name'>>
	title: string
	intent?: 'add' | 'edit' | 'delete'
}) {
	const actionData = useActionData<typeof action>()
	const disabled = intent === 'delete'
	const schema = intent === 'delete' ? OrganDeleteSchema : OrganEditorSchema
	const [form, fields] = useForm({
		id: 'register-organ',
		constraint: getZodConstraint(schema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema })
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
		defaultValue: organ,
	})

	return (
		<div className="flex flex-col gap-8">
			<Card className="w-full">
				<CardHeader>
					<CardTitle>{title}</CardTitle>
					{intent === 'delete' && (
						<CardDescription className="text-red-500 py-2">
							Are you sure you want to delete this organ? This action cannot be
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
							<Label
								htmlFor={fields.name.id}
								className={disabled ? 'text-muted-foreground' : ''}
							>
								Name
							</Label>
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
							<Label
								htmlFor={fields.code.id}
								className={disabled ? 'text-muted-foreground' : ''}
							>
								Code
							</Label>
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
							<Label
								htmlFor={fields.address.id}
								className={disabled ? 'text-muted-foreground' : ''}
							>
								Address
							</Label>
							<InputField
								meta={fields.address}
								type="text"
								autoComplete="off"
								disabled={disabled}
							/>
							{fields.address.errors && (
								<FieldError>{fields.address.errors}</FieldError>
							)}
						</Field>

						<Field>
							<Label
								htmlFor={fields.countryId.id}
								className={disabled ? 'text-muted-foreground' : ''}
							>
								Country
							</Label>
							<SelectField
								meta={fields.countryId}
								disabled={disabled}
								items={countries.map(country => ({
									name: country.name,
									value: country.id,
								}))}
								placeholder="Select a country"
							/>
							{fields.countryId.errors && (
								<FieldError>{fields.countryId.errors}</FieldError>
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
							<Link to="/settings/organs">Cancel</Link>
						</Button>
					</div>
				</CardFooter>
			</Card>
		</div>
	)
}
