import { AccessRequestEditor } from './__access-request-editor'
export { action } from './__access-request-editor.server'

export default function AddAccessRequestRoute() {
	return (
		<AccessRequestEditor
			title="Send Access Request"
			description="Please enter the access request details."
			intent="add"
		/>
	)
}
