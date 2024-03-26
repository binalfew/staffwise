import { CountryEditor } from './__country-editor'
export { action } from './__country-editor.server'

export default function AddCountryRoute() {
	return <CountryEditor title="Add Country" />
}
