import { SpouseEditor } from './__spouse-editor'
export { action } from './__spouse-editor.server'

export default function AddSpouseRoute() {
	return <SpouseEditor title="Add Spouse" />
}
