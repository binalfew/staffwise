import { FormProvider, getFormProps, useForm } from '@conform-to/react'
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

export function CountryEditor({
	country,
}: {
	country?: SerializeFrom<
		Pick<Country, 'id' | 'name' | 'code' | 'isMemberState'>
	>
}) {
	const actionData = useActionData<typeof action>()
	const [form, fields] = useForm({
		id: 'register-country',
		constraint: getZodConstraint(CountryEditorSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: CountryEditorSchema })
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
		defaultValue: country,
	})

	const title = country?.id ? 'Edit Country' : 'New Country'

	return (
		<div className="flex flex-col gap-8">
			<Card className="w-full">
				<CardHeader>
					<CardTitle>{title}</CardTitle>
					<CardDescription>
						Please fill out the form to register a new country.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<FormProvider context={form.context}>
						<Form className="grid gap-4" method="POST" {...getFormProps(form)}>
							<AuthenticityTokenInput />
							<HoneypotInputs />
							<InputField meta={fields.id} type="hidden" />
							<Field>
								<Label htmlFor={fields.name.id}>Name</Label>
								<InputField meta={fields.name} type="text" autoComplete="off" />
								{fields.name.errors && (
									<FieldError>{fields.name.errors}</FieldError>
								)}
							</Field>

							<Field>
								<Label htmlFor={fields.code.id}>Code</Label>
								<InputField meta={fields.code} type="text" autoComplete="off" />
								{fields.code.errors && (
									<FieldError>{fields.code.errors}</FieldError>
								)}
							</Field>

							<Field>
								<div className="flex items-center gap-2">
									<CheckboxField meta={fields.isMemberState} />
									<Label htmlFor={fields.isMemberState.id}>
										Is Member State
									</Label>
								</div>
								{fields.isMemberState.errors && (
									<FieldError>{fields.isMemberState.errors}</FieldError>
								)}
							</Field>
						</Form>
					</FormProvider>
				</CardContent>
				<CardFooter className="border-t px-6 py-4">
					<div className="flex items-center justify-end space-x-2">
						<Button type="submit" form={form.id}>
							Save
						</Button>
						<Button asChild variant="destructive">
							<Link to="/settings/countries">Cancel</Link>
						</Button>
					</div>
				</CardFooter>
			</Card>
		</div>
	)
}
