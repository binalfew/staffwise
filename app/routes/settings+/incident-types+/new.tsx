import { IncidentTypeEditor } from './__incident-type-editor'
export { action } from './__incident-type-editor.server'

export default function AddIncidentTypeRoute() {
	return <IncidentTypeEditor title="Add Incident Type" intent="add" />
}
