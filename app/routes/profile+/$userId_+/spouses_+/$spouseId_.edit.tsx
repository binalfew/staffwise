import { LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { prisma } from '~/utils/db.server'
import { invariantResponse } from '~/utils/misc'
import { SpouseEditor } from './__spouse-editor'
export { action } from './__spouse-editor.server'

export async function loader({ params }: LoaderFunctionArgs) {
	const { spouseId } = params

	const spouse = await prisma.spouse.findUnique({
		where: { id: spouseId },
	})

	invariantResponse(spouse, 'Not Found', { status: 404 })

	return json({ spouse })
}

export default function EditSpouseRoute() {
	const { spouse } = useLoaderData<typeof loader>()
	return (
		<SpouseEditor
			spouse={spouse}
			title="Edit Spouse"
			description="Edit the spouse details."
			intent="edit"
		/>
	)
}
