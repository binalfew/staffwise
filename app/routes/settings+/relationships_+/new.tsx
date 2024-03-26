import { RelationshipEditor } from './__relationship-editor'
export { action } from './__relationship-editor.server'

export default function AddRelationshipRoute() {
	return <RelationshipEditor title="Add Relationship" />
}
