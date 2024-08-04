import { LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { requireUser } from '~/utils/auth.server'
import { prisma } from '~/utils/db.server'
import { invariantResponse } from '~/utils/misc'
import { IdRequestEditor } from './__id-request-editor'
export { action } from './__id-request-editor.server'

export async function loader({ request }: LoaderFunctionArgs) {
	const user = await requireUser(request)
	invariantResponse(user, 'Not Found', { status: 404 })

	const employee = await prisma.employee.findFirst({
		where: { email: user.email },
		select: {
			spouses: {
				select: {
					id: true,
					firstName: true,
					middleName: true,
					familyName: true,
				},
			},
			dependants: {
				select: {
					id: true,
					firstName: true,
					middleName: true,
					familyName: true,
				},
			},
		},
	})

	invariantResponse(employee, 'Not Found', { status: 404 })

	return json({ spouses: employee.spouses, dependants: employee.dependants })
}

export default function AddIdRequestRoute() {
	const { spouses, dependants } = useLoaderData<typeof loader>()
	return (
		<IdRequestEditor
			title="Send ID Request"
			description="Please enter the ID request details."
			intent="add"
			spouses={spouses}
			dependants={dependants}
		/>
	)
}
