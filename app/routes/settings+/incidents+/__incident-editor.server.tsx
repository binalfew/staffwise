import { parseWithZod } from '@conform-to/zod'
import { ActionFunctionArgs, json } from '@remix-run/node'
import { requireUser } from '~/utils/auth.server'
import { validateCSRF } from '~/utils/csrf.server'
import { prisma } from '~/utils/db.server'
import { checkHoneypot } from '~/utils/honeypot.server'
import { invariantResponse } from '~/utils/misc'
import { redirectWithToast } from '~/utils/toast.server'
import { AssessmentFieldset, IncidentEditorSchema } from './__incident-editor'

const uniqueIncidentNumber = () => {
	const timestamp = Date.now()
	const randomComponent = Math.floor(Math.random() * 1000)
	return `${timestamp}${randomComponent}`
}

function assessmentHasId(
	assessment: AssessmentFieldset,
): assessment is AssessmentFieldset & {
	id: NonNullable<AssessmentFieldset['id']>
} {
	return assessment.id != null
}

export async function action({ params, request }: ActionFunctionArgs) {
	const user = await requireUser(request)
	const formData = await request.formData()
	checkHoneypot(formData)
	await validateCSRF(formData, request.headers)

	const intent = formData.get('intent')

	if (intent === 'delete') {
		const submission = await parseWithZod(formData, {
			schema: IncidentEditorSchema.transform(
				async ({ assessment, ...data }) => {
					return {
						...data,
						newAssessment: assessment?.id ? undefined : assessment,
						updatedAssessment: assessment?.id ? assessment : undefined,
					}
				},
			),
			async: true,
		})

		if (submission.status !== 'success') {
			return json(
				{ result: submission.reply() },
				{ status: submission.status === 'error' ? 400 : 200 },
			)
		}
		await prisma.incident.delete({
			where: { id: submission.value.id },
		})

		return redirectWithToast(`/profile/${user.id}/incidents`, {
			type: 'success',
			title: `Incident Deleted`,
			description: `Incident deleted successfully.`,
		})
	}

	const submission = await parseWithZod(formData, {
		schema: IncidentEditorSchema.transform(async ({ assessment, ...data }) => {
			return {
				...data,
				newAssessment: assessment?.id ? undefined : assessment,
				updatedAssessment: assessment?.id ? assessment : undefined,
			}
		}),
		async: true,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const employee = await prisma.employee.findFirst({
		where: { email: user.email },
		select: { id: true },
	})

	invariantResponse(employee, 'Employee not found', {
		status: 404,
	})

	const {
		id: incidentId,
		incidentTypeId,
		location,
		description,
		eyeWitnesses,
		occuredWhile,
		occuredAt,
		newAssessment,
		updatedAssessment,
	} = submission.value

	const data = {
		employeeId: employee.id,
		incidentNumber: uniqueIncidentNumber(),
		incidentTypeId,
		location,
		description,
		eyeWitnesses,
		occuredWhile,
		occuredAt,
	}

	await prisma.incident.upsert({
		select: { id: true },
		where: { id: incidentId ?? '__new_incident__' },
		create: {
			...data,
			assessment: {
				create: newAssessment,
			},
		},
		update: {
			...data,
			assessment: {
				delete: {
					id: updatedAssessment?.id,
				},
				update: {
					where: {
						id: updatedAssessment?.id,
					},
					data: {
						...updatedAssessment,
					},
				},
				create: newAssessment,
			},
		},
	})

	return redirectWithToast(`/profile/${user.id}/incidents`, {
		type: 'success',
		title: `Incident ${incidentId ? 'Updated' : 'Created'}`,
		description: `Incident ${incidentId ? 'updated' : 'created'} successfully.`,
	})
}
