import { LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { prisma } from '~/utils/db.server.ts'
import { invariantResponse } from '~/utils/misc.tsx'
import { CountryEditor } from './__country-editor'
export { action } from './__country-editor.server'

export async function loader({ params }: LoaderFunctionArgs) {
	const { countryId } = params

	const country = await prisma.country.findUnique({
		where: { id: countryId },
	})

	invariantResponse(country, 'Not Found', { status: 404 })

	return json({ country })
}

export default function EditCountryRoute() {
	const { country } = useLoaderData<typeof loader>()
	return <CountryEditor country={country} title="Edit Country" />
}
