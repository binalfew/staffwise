import { z } from 'zod'
import { prisma } from './db.server'

type DutyStationPlace = {
	organId: string
	departmentId: string
	locationId: string | null
	buildingName: string | null
	floorId: string | null
	floorName: string | null
}

/**
 * Server-side rules for building/floor, on top of the shared Zod refine:
 * organs with configured locations must pick one of their own (no free text),
 * and locations with configured floors must pick one of their own floors.
 * Organs with departments must pick one of their own; organs without any may
 * pick any (HQ parent) department.
 */
export async function validateDutyStationPlace(
	data: DutyStationPlace,
	ctx: z.RefinementCtx,
) {
	const organDepartments = await prisma.department.findMany({
		where: { organId: data.organId },
		select: { id: true },
	})
	if (
		organDepartments.length > 0 &&
		!organDepartments.some(({ id }) => id === data.departmentId)
	) {
		ctx.addIssue({
			path: ['departmentId'],
			code: z.ZodIssueCode.custom,
			message: 'Select a department for this organ',
		})
	}

	// Missing values are already reported by refineDutyStationPlace.
	if (!data.locationId && !data.buildingName) return

	const organLocations = await prisma.location.findMany({
		where: { organId: data.organId },
		select: { id: true, floors: { select: { id: true } } },
	})

	if (organLocations.length === 0) {
		if (data.locationId) {
			ctx.addIssue({
				path: ['buildingName'],
				code: z.ZodIssueCode.custom,
				message: 'This organ has no locations set up; type the building',
			})
		}
		return
	}

	const location = organLocations.find(({ id }) => id === data.locationId)
	if (!location) {
		ctx.addIssue({
			path: ['locationId'],
			code: z.ZodIssueCode.custom,
			message: 'Select a location for this organ',
		})
		return
	}

	if (!data.floorId && !data.floorName) return
	if (
		location.floors.length > 0 &&
		!location.floors.some(({ id }) => id === data.floorId)
	) {
		ctx.addIssue({
			path: ['floorId'],
			code: z.ZodIssueCode.custom,
			message: 'Select a floor for this location',
		})
	}
}

/** Keep either the picked location/floor or the typed name, never both. */
export function normalizeDutyStationPlace<T extends DutyStationPlace>(
	data: T,
): T {
	const locationId = data.locationId
	const floorId = locationId ? data.floorId : null
	return {
		...data,
		locationId,
		buildingName: locationId ? null : data.buildingName,
		floorId,
		floorName: floorId ? null : data.floorName,
	}
}
