import { IncidentStatus, Prisma } from '@prisma/client'
import { prisma } from '~/utils/db.server'

type Tx = Prisma.TransactionClient

/**
 * Moves an incident to a new status and records it in IncidentStatusHistory
 * and the audit log. Pass `tx` to run inside an existing transaction.
 */
export async function changeIncidentStatus(
	{
		incidentId,
		toStatus,
		userId,
		remarks,
		isVisibleToReporter,
	}: {
		incidentId: string
		toStatus: IncidentStatus
		userId: string | null
		remarks?: string | null
		isVisibleToReporter: boolean
	},
	tx?: Tx,
) {
	const run = async (db: Tx) => {
		const incident = await db.incident.findUniqueOrThrow({
			where: { id: incidentId },
			select: { status: true, incidentNumber: true },
		})

		await db.incident.update({
			where: { id: incidentId },
			data: { status: toStatus },
		})

		const history = await db.incidentStatusHistory.create({
			data: {
				incidentId,
				fromStatus: incident.status,
				toStatus,
				changedById: userId,
				remarks: remarks || null,
				isVisibleToReporter,
			},
		})

		if (userId) {
			await db.auditLog.create({
				data: {
					userId,
					action: 'UPDATE',
					entity: 'Incident',
					details: {
						incidentId,
						incidentNumber: incident.incidentNumber,
						field: 'status',
						from: incident.status,
						to: toStatus,
						remarks: remarks || null,
					},
				},
			})
		}

		return { fromStatus: incident.status, history }
	}

	return tx ? run(tx) : prisma.$transaction(run)
}
