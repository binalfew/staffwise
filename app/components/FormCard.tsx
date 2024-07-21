import { getFormProps } from '@conform-to/react'
import { Form } from '@remix-run/react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { HoneypotInputs } from 'remix-utils/honeypot/react'

import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '~/components/ui/card'
import { Separator } from '~/components/ui/separator'

export default function FormCard({
	form,
	fields,
	buttons,
	title,
	intent,
	description,
}: {
	form: any
	title: string
	description: string
	intent: 'add' | 'edit' | 'delete'
	fields: JSX.Element
	buttons: JSX.Element
}) {
	return (
		<Card className="mx-auto w-full max-w-7xl space-y-6 p-6">
			<Form className="grid gap-4" method="POST" {...getFormProps(form)}>
				<div className="space-y-2 text-center">
					<CardHeader>
						<CardTitle className="text-3xl font-bold">{title}</CardTitle>
						<CardDescription
							className={
								intent === 'delete'
									? 'text-red-500'
									: 'text-gray-500 dark:text-gray-400'
							}
						>
							{description}
						</CardDescription>
						<Separator />
					</CardHeader>
				</div>

				<CardContent className="space-y-4">
					<AuthenticityTokenInput />
					<HoneypotInputs />
					{fields}
				</CardContent>

				<CardFooter className="text-center space-x-4">{buttons}</CardFooter>
			</Form>
		</Card>
	)
}
