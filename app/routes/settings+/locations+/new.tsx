import { LocationEditor } from './__location-editor'
export { action } from './__location-editor.server'

export default function AddLocationRoute() {
	return <LocationEditor title="Add Location" />
}
