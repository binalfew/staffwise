import { ExclamationTriangleIcon } from '@heroicons/react/24/solid'
import {
	isRouteErrorResponse,
	useParams,
	useRouteError,
} from '@remix-run/react'
import { type ErrorResponse } from '@remix-run/router'
import { ArrowLeftCircleIcon } from 'lucide-react'
import { getErrorMessage } from '~/utils/misc'

type StatusHandler = (info: {
	error: ErrorResponse
	params: Record<string, string | undefined>
}) => JSX.Element | null

export function GeneralErrorBoundary({
	defaultStatusHandler = ({ error }) => (
		<ErrorDisplay
			title={`${error.status} ${error.statusText}`}
			message={error.data}
		/>
	),
	statusHandlers,
	unexpectedErrorHandler = error => (
		<ErrorDisplay title="Unexpected Error" message={getErrorMessage(error)} />
	),
}: {
	defaultStatusHandler?: StatusHandler
	statusHandlers?: Record<number, StatusHandler>
	unexpectedErrorHandler?: (error: unknown) => JSX.Element | null
}) {
	const error = useRouteError()
	const params = useParams()

	if (typeof document !== 'undefined') {
		console.error(error)
	}

	return (
		<div className="container mx-auto flex h-full w-full items-center justify-center p-8">
			{isRouteErrorResponse(error)
				? (statusHandlers?.[error.status] ?? defaultStatusHandler)({
						error,
						params,
				  })
				: unexpectedErrorHandler(error)}
		</div>
	)
}

export function ErrorDisplay({
	title,
	message,
	redirectUrl = '/',
}: {
	title: string
	message: string
	redirectUrl?: string
}) {
	return (
		<div className="bg-background shadow-lg rounded-lg p-8 max-w-md w-full text-center">
			<ExclamationTriangleIcon className="h-16 w-16 text-destructive mx-auto mb-4" />
			<h1 className="text-3xl font-bold text-foreground mb-2">{title}</h1>
			<div className="bg-muted p-4 rounded-md mb-4">
				<p className="text-muted-foreground">{message}</p>
			</div>
			<a
				href={redirectUrl ?? '/'}
				className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
			>
				<ArrowLeftCircleIcon className="h-5 w-5" />
				Go back
			</a>
		</div>
	)
}
