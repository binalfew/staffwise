import { LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { prisma } from '~/utils/db.server'
import { invariantResponse } from '~/utils/misc'
import { DepartmentEditor } from './__department-editor'
export { action } from './__department-editor.server'

export async function loader({ params }: LoaderFunctionArgs) {
	const { departmentId } = params

	const department = await prisma.department.findUnique({
		where: { id: departmentId },
	})

	invariantResponse(department, 'Not Found', { status: 404 })

	return json({ department })
}

export default function EditDepartmentRoute() {
	const { department } = useLoaderData<typeof loader>()
	return <DepartmentEditor department={department} title="Edit Department" />
}
