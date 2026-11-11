import { sendEmail } from '~/utils/email.server'
import { prisma } from '~/utils/db.server'
import { incidentStatusLabels } from '~/utils/incident-status'
import { formatFullName, getDomainUrl } from '~/utils/misc'

/** Severities that email the incident admins when an incident is reported. */
export const ALERT_SEVERITIES = ['critical']

/**
 * Users with this role receive critical-incident alerts: global ones for every
 * incident, office-scoped ones (see incident-scope.server.ts) only for their
 * offices.
 */
const ALERT_ROLE = 'incidentAdmin'

export function isAlertSeverity(severity: string | null | undefined) {
	return ALERT_SEVERITIES.includes((severity ?? '').toLowerCase())
}

function escapeHtml(value: string) {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
}

function emailHtml(
	heading: string,
	rows: Array<[string, string]>,
	link: { href: string; label: string },
	intro?: string,
) {
	const tableRows = rows
		.map(
			([label, value]) =>
				`<tr><td style="padding:4px 12px 4px 0;color:#6b7280;vertical-align:top">${escapeHtml(
					label,
				)}</td><td style="padding:4px 0;color:#111827;white-space:pre-line">${escapeHtml(
					value,
				)}</td></tr>`,
		)
		.join('')
	return `<html><body style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111827">
<h2 style="margin:0 0 12px">${escapeHtml(heading)}</h2>
${intro ? `<p>${escapeHtml(intro)}</p>` : ''}
<table style="border-collapse:collapse">${tableRows}</table>
<p style="margin-top:16px"><a href="${escapeHtml(link.href)}">${escapeHtml(
		link.label,
	)}</a></p>
</body></html>`
}

function emailText(
	heading: string,
	rows: Array<[string, string]>,
	link: { href: string; label: string },
	intro?: string,
) {
	const lines = [heading, '']
	if (intro) lines.push(intro, '')
	lines.push(...rows.map(([label, value]) => `${label}: ${value}`))
	lines.push('', `${link.label}: ${link.href}`)
	return lines.join('\n')
}

/**
 * Emails the incident admins responsible for the reporter's office when a
 * critical incident is reported.
 * Call without awaiting: it never throws, and sending can take a while.
 */
export async function sendCriticalIncidentAlert(
	incidentId: string,
	request: Request,
) {
	try {
		const incident = await prisma.incident.findUnique({
			where: { id: incidentId },
			select: {
				id: true,
				incidentNumber: true,
				severity: true,
				location: true,
				description: true,
				occuredAt: true,
				timeOfDay: true,
				incidentType: { select: { name: true } },
				employee: {
					select: {
						firstName: true,
						middleName: true,
						familyName: true,
						email: true,
						mobileTelephoneNumber: true,
						organId: true,
						organ: { select: { name: true } },
					},
				},
			},
		})
		if (!incident || !isAlertSeverity(incident.severity)) return

		const recipients = await prisma.user.findMany({
			where: {
				roles: { some: { name: ALERT_ROLE } },
				OR: [
					{ roles: { some: { name: 'admin' } } },
					{ adminOrgans: { none: {} } },
					{ adminOrgans: { some: { organId: incident.employee.organId } } },
				],
			},
			select: { email: true },
		})
		if (recipients.length === 0) {
			console.warn(
				`Critical incident ${incident.incidentNumber}: no ${ALERT_ROLE} users to alert`,
			)
			return
		}

		const heading = `Critical incident reported: ${incident.incidentNumber}`
		const rows: Array<[string, string]> = [
			['Type', incident.incidentType.name],
			['Severity', incident.severity],
			['Reported by', formatFullName(incident.employee)],
			['Reporter email', incident.employee.email],
			['Reporter mobile', incident.employee.mobileTelephoneNumber ?? ''],
			['Organ', incident.employee.organ?.name ?? ''],
			['Location', incident.location],
			[
				'Occurred',
				`${incident.occuredAt.toISOString().slice(0, 10)} ${
					incident.timeOfDay
				}`.trim(),
			],
			['Description', incident.description],
		]
		const link = {
			href: `${getDomainUrl(request)}/dashboard/incidents/${incident.id}`,
			label: 'Open the incident in Staffwise',
		}

		await Promise.all(
			recipients.map(({ email }) =>
				sendEmail({
					to: email,
					subject: `[CRITICAL] Incident ${incident.incidentNumber}: ${incident.incidentType.name}`,
					plainText: emailText(heading, rows, link),
					html: emailHtml(heading, rows, link),
				}),
			),
		)
	} catch (error) {
		console.error(`Critical incident alert for ${incidentId} failed:`, error)
	}
}

/**
 * Emails the reporter about a status change. Internal remarks are left out.
 * Call without awaiting: it never throws, and sending can take a while.
 */
export async function sendIncidentStatusEmail(
	statusHistoryId: string,
	request: Request,
) {
	try {
		const entry = await prisma.incidentStatusHistory.findUnique({
			where: { id: statusHistoryId },
			select: {
				toStatus: true,
				remarks: true,
				isVisibleToReporter: true,
				incident: {
					select: {
						id: true,
						incidentNumber: true,
						incidentType: { select: { name: true } },
						employee: {
							select: {
								firstName: true,
								middleName: true,
								familyName: true,
								email: true,
							},
						},
					},
				},
			},
		})
		if (!entry) return

		const { incident } = entry
		const reporterUser = await prisma.user.findFirst({
			where: {
				email: { equals: incident.employee.email, mode: 'insensitive' },
			},
			select: { id: true },
		})

		const status = incidentStatusLabels[entry.toStatus]
		const heading = `Your incident ${incident.incidentNumber} is now: ${status}`
		const rows: Array<[string, string]> = [
			['Incident', incident.incidentNumber],
			['Type', incident.incidentType.name],
			['Status', status],
		]
		if (entry.isVisibleToReporter && entry.remarks) {
			rows.push(['Remarks', entry.remarks])
		}
		const domain = getDomainUrl(request)
		const link = {
			href: reporterUser
				? `${domain}/profile/${reporterUser.id}/incidents/${incident.id}`
				: `${domain}/login`,
			label: 'Follow your incident in Staffwise',
		}
		const intro = `Dear ${formatFullName(
			incident.employee,
		)}, the status of the incident you reported has changed.`

		await sendEmail({
			to: incident.employee.email,
			subject: `Incident ${incident.incidentNumber}: ${status}`,
			plainText: emailText(heading, rows, link, intro),
			html: emailHtml(heading, rows, link, intro),
		})
	} catch (error) {
		console.error(
			`Incident status email for history ${statusHistoryId} failed:`,
			error,
		)
	}
}
