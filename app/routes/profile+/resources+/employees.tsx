import { LoaderFunctionArgs } from '@remix-run/node'
import * as XLSX from 'xlsx'
import { prisma } from '~/utils/db.server'

export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url)
	const searchParams = url.searchParams

	const conditions = []

	if (
		searchParams.get('organId') &&
		searchParams.get('organId') !== 'all' &&
		searchParams.get('organId') !== ''
	) {
		conditions.push({
			organId: searchParams.get('organId'),
		})
	}
	if (
		searchParams.get('departmentId') &&
		searchParams.get('departmentId') !== 'all' &&
		searchParams.get('departmentId') !== ''
	) {
		conditions.push({ departmentId: searchParams.get('departmentId') })
	}

	const employees = await prisma.employee.findMany({
		orderBy: {
			firstName: 'asc',
		},
		select: {
			auIdNumber: true,
			firstName: true,
			middleName: true,
			familyName: true,
			email: true,
			country: {
				select: {
					name: true,
				},
			},
			organ: {
				select: {
					name: true,
				},
			},
			department: {
				select: {
					name: true,
				},
			},
			location: {
				select: {
					name: true,
				},
			},
			floor: {
				select: {
					name: true,
				},
			},
			officeNumber: true,
		},
		where:
			conditions.length > 0
				? {
						AND: conditions.map(condition => ({
							...(condition.organId && {
								organId: condition.organId,
							}),
							...(condition.departmentId && {
								departmentId: condition.departmentId,
							}),
						})),
				  }
				: undefined,
	})

	// Create a new workbook and worksheet
	const workbook = XLSX.utils.book_new()
	const worksheet = XLSX.utils.json_to_sheet(
		employees.map(employee => ({
			ID: employee.auIdNumber,
			'First Name': employee.firstName,
			'Middle Name': employee.middleName,
			'Family Name': employee.familyName,
			Email: employee.email,
			Country: employee.country.name,
			Organ: employee.organ.name,
			Department: employee.department.name,
			Location: employee.location.name,
			Floor: employee.floor.name,
			'Office Number': employee.officeNumber,
		})),
	)

	// Add the worksheet to the workbook
	XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees')

	// Generate Excel file buffer
	const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

	return new Response(excelBuffer, {
		headers: {
			'content-type':
				'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'content-disposition': `attachment; filename="employees.xlsx"`,
		},
	})
}
