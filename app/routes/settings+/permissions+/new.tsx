import { PermissionEditor } from './__permission-editor'
export { action } from './__permission-editor.server'

export default function AddRoleRoute() {
	return <PermissionEditor title="Add Permission" />
}
