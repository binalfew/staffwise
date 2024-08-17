import { OfficerEditor } from './__officer-editor'
export { action } from './__officer-editor.server'

export default function AddOfficerRoute() {
	return <OfficerEditor title="Add Officer" intent="add" />
}
