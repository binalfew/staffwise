import { Form, useSearchParams, useSubmit } from '@remix-run/react'
import { SearchIcon } from 'lucide-react'
import { useId } from 'react'
import { useDebounce, useIsPending } from '~/utils/misc.tsx'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { StatusButton } from './ui/status-button'

export function SearchBar({
	status,
	autoSubmit = false,
	action,
}: {
	status: 'idle' | 'pending' | 'success' | 'error'
	autoSubmit?: boolean
	action: string
}) {
	const id = useId()
	const [searchParams] = useSearchParams()
	const submit = useSubmit()
	const isSubmitting = useIsPending({
		formMethod: 'GET',
		formAction: action,
	})

	const handleFormChange = useDebounce((form: HTMLFormElement) => {
		submit(form)
	}, 400)

	return (
		<Form
			method="GET"
			action={action}
			className="flex flex-wrap items-center justify-center gap-2"
			onChange={e => autoSubmit && handleFormChange(e.currentTarget)}
		>
			<div className="flex-1">
				<Label htmlFor={id} className="sr-only">
					Search
				</Label>
				<Input
					type="search"
					name="search"
					id={id}
					defaultValue={searchParams.get('search') ?? ''}
					placeholder="Search"
					className="w-full"
				/>
			</div>
			<div>
				<StatusButton
					type="submit"
					status={isSubmitting ? 'pending' : status}
					className="flex w-full items-center justify-center"
					size="sm"
				>
					<SearchIcon className="h-4 w-4" />
					<span className="sr-only">Search</span>
				</StatusButton>
			</div>
		</Form>
	)
}
