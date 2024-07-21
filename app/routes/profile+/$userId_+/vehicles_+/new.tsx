import { VehicleEditor } from './__vehicle-editor'
export { action } from './__vehicle-editor.server'

export default function AddVehicleRoute() {
	return (
		<VehicleEditor
			title="Add Vehicle"
			description="Add a new vehicle to your profile."
			intent="add"
		/>
	)
}
