import { LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { prisma } from '~/utils/db.server'
import { invariantResponse } from '~/utils/misc'
import { DepartmentEditor } from './__department-editor'
export { action } from './__department-editor.server'

export async function loader({ params }: LoaderFunctionArgs) {
	const { departmentId } = params

	// Fetch the department to be edited
	const department = await prisma.department.findUnique({
		where: { id: departmentId },
	})

	// Fetch all organs for the selection dropdown
	const organs = await prisma.organ.findMany({
		select: { id: true, name: true },
	})

	invariantResponse(department, 'Not Found', { status: 404 })

	return json({ department, organs })
}

export default function EditDepartmentRoute() {
	const { department, organs } = useLoaderData<typeof loader>()
	return (
		<DepartmentEditor
			department={department}
			organs={organs}
			title="Edit Department"
		/>
	)
}
