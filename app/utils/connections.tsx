import { GitHubLogoIcon } from '@radix-ui/react-icons'
import { Form } from '@remix-run/react'
import { z } from 'zod'
import { Button } from '~/components/ui/button.tsx'

const GITHUB_PROVIDER_NAME = 'github'
// to add another provider, set their name here and add it to the providerNames below

export const providerNames = [GITHUB_PROVIDER_NAME] as const
export const ProviderNameSchema = z.enum(providerNames)
export type ProviderName = z.infer<typeof ProviderNameSchema>

export const providerLabels: Record<ProviderName, string> = {
	[GITHUB_PROVIDER_NAME]: 'GitHub',
} as const

export const providerIcons: Record<ProviderName, React.ReactNode> = {
	[GITHUB_PROVIDER_NAME]: <GitHubLogoIcon />,
} as const

export function ProviderConnectionForm({
	type,
	providerName,
}: {
	type: 'Connect' | 'Login' | 'Signup'
	providerName: ProviderName
}) {
	const label = providerLabels[providerName]
	const formAction = `/auth/${providerName}`
	return (
		<Form
			className="flex items-center justify-center gap-2"
			action={formAction}
			method="POST"
		>
			<Button type="submit" className="w-full">
				{type} with {label}
			</Button>
		</Form>
	)
}
