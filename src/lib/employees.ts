import { supabaseAdmin } from '@/lib/supabase/service-role'
import { Employee, Department, Position } from '@/types'

// ============================================================
// DEPARTMENTS
// ============================================================
export async function getDepartments() {
  const { data, error } = await supabaseAdmin
    .from('departments')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (error) throw error
  return data as Department[]
}

// ============================================================
// POSITIONS
// ============================================================
export async function getPositions(departmentId?: string) {
  let query = supabaseAdmin.from('positions').select('*, departments(name)').eq('is_active', true)
  
  if (departmentId) {
    query = query.eq('department_id', departmentId)
  }
  
  const { data, error } = await query.order('title')
  if (error) throw error
  return data as (Position & { departments: { name: string } })[]
}

// ============================================================
// EMPLOYEES
// ============================================================
export async function getEmployees(filters?: {
  departmentId?: string
  status?: string
  search?: string
}) {
  let query = supabaseAdmin
    .from('employees')
    .select('*, departments(name, code), positions(title)')
    .order('full_name')

  if (filters?.departmentId) {
    query = query.eq('department_id', filters.departmentId)
  }
  if (filters?.status) {
    query = query.eq('employment_status', filters.status)
  }
  if (filters?.search) {
    query = query.or(`full_name.ilike.%${filters.search}%,employee_number.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data as (Employee & { departments: Department; positions: Position })[]
}

export async function getEmployee(id: string) {
  const { data, error } = await supabaseAdmin
    .from('employees')
    .select('*, departments(*), positions(*)')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Employee & { departments: Department; positions: Position }
}

export async function createEmployee(employee: {
  employee_number: string
  full_name: string
  email: string
  phone?: string
  address?: string
  department_id: string
  position_id: string
  hire_date: string
  employment_status?: string
  salary?: number
  emergency_contact_name?: string
  emergency_contact_phone?: string
}) {
  const { data, error } = await supabaseAdmin
    .from('employees')
    .insert(employee)
    .select()
    .single()

  if (error) throw error
  return data as Employee
}

export async function updateEmployee(
  id: string,
  updates: Partial<Employee>
) {
  const { data, error } = await supabaseAdmin
    .from('employees')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Employee
}

export async function deleteEmployee(id: string) {
  const { error } = await supabaseAdmin
    .from('employees')
    .update({ is_active: false })
    .eq('id', id)

  if (error) throw error
}

export async function generateEmployeeNumber() {
  const { data, error } = await supabaseAdmin
    .from('employees')
    .select('employee_number')
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) throw error

  if (!data || data.length === 0) {
    return 'EMP001'
  }

  const last = data[0].employee_number
  const num = parseInt(last.replace('EMP', '')) + 1
  return `EMP${num.toString().padStart(3, '0')}`
}
