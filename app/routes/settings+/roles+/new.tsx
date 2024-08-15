import { RoleEditor } from './__role-editor'
export { action } from './__role-editor.server'

export default function AddRoleRoute() {
	return <RoleEditor title="Add Role" />
}
