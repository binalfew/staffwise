import { UserEditor } from './__user-editor'
export { action } from './__user-editor.server'

export default function AddRoleRoute() {
	return <UserEditor title="Add User" />
}
