import { type Params } from '@remix-run/react'
import { requireUser } from '~/utils/auth.server'
import { prisma } from '~/utils/db.server'
import { invariantResponse } from '~/utils/misc'
import { redirectWithToast } from '~/utils/toast.server'

/**
 * The `$userId_+` routes opt out of the `$userId.tsx` layout, so its auth
 * check doesn't run for them. Every reporter incident route calls this instead.
 */
export async function requireReporter(request: Request, params: Params) {
	const user = await requireUser(request)
	invariantResponse(user.id === params.userId, 'Not authorized', {
		status: 403,
	})

	const employee = await prisma.employee.findFirst({
		where: { email: { equals: user.email, mode: 'insensitive' } },
		select: { id: true },
	})
	invariantResponse(employee, 'Employee not found', { status: 404 })

	return { user, employee }
}

/** Loads an incident only if it belongs to the signed-in reporter. */
export async function requireOwnIncident(
	request: Request,
	params: Params,
	incidentId: string | undefined = params.incidentId,
) {
	const { user, employee } = await requireReporter(request, params)

	const incident = await prisma.incident.findFirst({
		where: { id: incidentId ?? '', employeeId: employee.id },
		select: { id: true, status: true, incidentNumber: true },
	})
	invariantResponse(incident, 'Incident not found', { status: 404 })

	return { user, employee, incident }
}

/**
 * Reporters can change or delete an incident only while it is SUBMITTED.
 * Once an admin has picked it up, send them to the read-only page instead.
 */
export async function requireEditableIncident(
	request: Request,
	params: Params,
	incidentId?: string,
) {
	const result = await requireOwnIncident(request, params, incidentId)
	if (result.incident.status !== 'SUBMITTED') {
		throw await redirectWithToast(
			`/profile/${result.user.id}/incidents/${result.incident.id}`,
			{
				type: 'error',
				title: 'Incident locked',
				description:
					'This incident is already being handled, so it can no longer be changed or deleted.',
			},
		)
	}
	return result
}
