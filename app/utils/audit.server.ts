import { Prisma } from '@prisma/client'
import { prisma } from '~/utils/db.server'

export async function insertAuditLog({
	user,
	action,
	entity,
	details,
}: {
	user: { id: string }
	action:
		| 'CREATE'
		| 'READ'
		| 'UPDATE'
		| 'DELETE'
		| 'LOGIN'
		| 'LOGOUT'
		| 'REGISTER'
		| 'RESET_PASSWORD'
		| 'CHANGE_PASSWORD'
		| 'VERIFY_EMAIL'
	entity: string
	details?: Record<string, unknown>
	request?: Request
}) {
	return prisma.auditLog.create({
		data: {
			userId: user.id,
			action,
			entity,
			details: details ? (details as Prisma.InputJsonValue) : undefined,
		},
	})
}
