import { type IncidentStatus } from '@prisma/client'
import {
	incidentStatusBadgeClasses,
	incidentStatusLabels,
} from '~/utils/incident-status'
import { cn } from '~/utils/misc'

export function IncidentStatusBadge({
	status,
	className,
}: {
	status: IncidentStatus
	className?: string
}) {
	return (
		<span
			className={cn(
				'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold',
				incidentStatusBadgeClasses[status],
				className,
			)}
		>
			{incidentStatusLabels[status]}
		</span>
	)
}
