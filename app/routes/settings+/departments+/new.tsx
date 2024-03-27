import { DepartmentEditor } from './__department-editor'
export { action } from './__department-editor.server'

export default function AddDepartmentRoute() {
	return <DepartmentEditor title="Add Department" />
}
