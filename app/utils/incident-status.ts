import { IncidentStatus } from '@prisma/client'

export const incidentStatuses = Object.values(IncidentStatus)

export const incidentStatusLabels: Record<IncidentStatus, string> = {
	SUBMITTED: 'Submitted',
	UNDER_REVIEW: 'Under Review',
	IN_PROGRESS: 'In Progress',
	ESCALATED: 'Escalated',
	RESOLVED: 'Resolved',
	CLOSED: 'Closed',
}

export const incidentStatusBadgeClasses: Record<IncidentStatus, string> = {
	SUBMITTED: 'bg-gray-100 text-gray-700',
	UNDER_REVIEW: 'bg-blue-100 text-blue-800',
	IN_PROGRESS: 'bg-amber-100 text-amber-800',
	ESCALATED: 'bg-red-100 text-red-800',
	RESOLVED: 'bg-green-100 text-green-800',
	CLOSED: 'bg-slate-200 text-slate-700',
}

export function isIncidentStatus(value: unknown): value is IncidentStatus {
	return (
		typeof value === 'string' && (incidentStatuses as string[]).includes(value)
	)
}
