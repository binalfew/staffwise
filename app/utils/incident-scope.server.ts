import { type Prisma } from '@prisma/client'
import { prisma } from '~/utils/db.server'
import { invariantResponse } from '~/utils/misc'
import { requireUserWithRoles } from '~/utils/permission.server'

/**
 * Which incidents an admin may see. `null` means all of them.
 *
 * `admin` users and incident admins with no offices assigned are global.
 * An incident admin with offices assigned (Settings → Users) sees only
 * incidents reported by staff of those organs.
 */
export type IncidentScope = { organIds: string[] } | null

export async function getIncidentScope(userId: string): Promise<IncidentScope> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			roles: { where: { name: 'admin' }, select: { id: true } },
			adminOrgans: { select: { organId: true } },
		},
	})
	if (!user || user.roles.length > 0 || user.adminOrgans.length === 0) {
		return null
	}
	return { organIds: user.adminOrgans.map(({ organId }) => organId) }
}

/** Prisma filter for incidents inside the scope. Spread it into `where`. */
export function incidentScopeWhere(
	scope: IncidentScope,
): Prisma.IncidentWhereInput {
	return scope ? { employee: { organId: { in: scope.organIds } } } : {}
}

/** Signed-in incident admin, with the filter for the incidents they may see. */
export async function requireIncidentAdmin(request: Request) {
	const user = await requireUserWithRoles(request, ['admin', 'incidentAdmin'])
	const scope = await getIncidentScope(user.id)
	return { user, scope, scopeWhere: incidentScopeWhere(scope) }
}

/** Like requireIncidentAdmin, and 404s unless the incident is in scope. */
export async function requireIncidentInScope(
	request: Request,
	where: Prisma.IncidentWhereInput,
) {
	const result = await requireIncidentAdmin(request)
	const incident = await prisma.incident.findFirst({
		where: { AND: [where, result.scopeWhere] },
		select: { id: true },
	})
	invariantResponse(incident, 'Incident not found', { status: 404 })
	return { ...result, incidentId: incident.id }
}

/** 404s unless the employee belongs to one of the admin's offices. */
export function requireEmployeeInScope(
	scope: IncidentScope,
	employee: { organId: string },
) {
	invariantResponse(
		!scope || scope.organIds.includes(employee.organId),
		'Employee not found',
		{ status: 404 },
	)
}
