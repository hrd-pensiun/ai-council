import { supabaseAdmin } from '@/lib/supabase/service-role'
import { LeaveRequest, LeaveBalance, LeaveType } from '@/types'

export async function getLeaveTypes() {
  const { data, error } = await supabaseAdmin
    .from('leave_types')
    .select('*')
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return data as LeaveType[]
}

export async function getLeaveBalances(employeeId: string, year?: number) {
  const y = year || new Date().getFullYear()
  const { data, error } = await supabaseAdmin
    .from('leave_balances')
    .select('*, leave_types(name, code)')
    .eq('employee_id', employeeId)
    .eq('year', y)
  if (error) throw error
  return data as (LeaveBalance & { leave_types: LeaveType })[]
}

export async function getOrCreateLeaveBalance(
  employeeId: string,
  leaveTypeId: string,
  year: number
) {
  // Check if exists
  const { data: existing } = await supabaseAdmin
    .from('leave_balances')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('leave_type_id', leaveTypeId)
    .eq('year', year)
    .single()

  if (existing) return existing

  // Get default days from leave type
  const { data: leaveType } = await supabaseAdmin
    .from('leave_types')
    .select('default_days_per_year')
    .eq('id', leaveTypeId)
    .single()

  // Create balance
  const { data, error } = await supabaseAdmin
    .from('leave_balances')
    .insert({
      employee_id: employeeId,
      leave_type_id: leaveTypeId,
      year,
      total_days: leaveType?.default_days_per_year || 0,
      used_days: 0,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getLeaveRequests(filters?: {
  employeeId?: string
  status?: string
  year?: number
}) {
  let query = supabaseAdmin
    .from('leave_requests')
    .select('*, employees(full_name, employee_number), leave_types(name, code)')
    .order('created_at', { ascending: false })

  if (filters?.employeeId) {
    query = query.eq('employee_id', filters.employeeId)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.year) {
    query = query.gte('start_date', `${filters.year}-01-01`)
    query = query.lte('start_date', `${filters.year}-12-31`)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getLeaveRequest(id: string) {
  const { data, error } = await supabaseAdmin
    .from('leave_requests')
    .select('*, employees(*), leave_types(*)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createLeaveRequest(request: {
  employee_id: string
  leave_type_id: string
  start_date: string
  end_date: string
  total_days: number
  reason?: string
}) {
  // Check and update balance
  const year = new Date(request.start_date).getFullYear()
  const balance = await getOrCreateLeaveBalance(
    request.employee_id,
    request.leave_type_id,
    year
  )

  const remaining = (balance.total_days || 0) - (balance.used_days || 0)
  if (remaining < request.total_days) {
    throw new Error(`Insufficient leave balance. Available: ${remaining} days`)
  }

  // Create request
  const { data, error } = await supabaseAdmin
    .from('leave_requests')
    .insert({ ...request, status: 'pending' })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function approveLeaveRequest(id: string, approverId: string) {
  const { data: request } = await supabaseAdmin
    .from('leave_requests')
    .select('*, employees(*), leave_types(*)')
    .eq('id', id)
    .single()

  if (!request) throw new Error('Leave request not found')

  // Update request status
  const { data, error } = await supabaseAdmin
    .from('leave_requests')
    .update({
      status: 'approved',
      approved_by: approverId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  // Update used days in balance
  const year = new Date(request.start_date).getFullYear()
  const balance = await getOrCreateLeaveBalance(
    request.employee_id,
    request.leave_type_id,
    year
  )

  await supabaseAdmin
    .from('leave_balances')
    .update({ used_days: (balance.used_days || 0) + request.total_days })
    .eq('id', balance.id)

  return data
}

export async function rejectLeaveRequest(id: string, reason?: string) {
  const { data, error } = await supabaseAdmin
    .from('leave_requests')
    .update({
      status: 'rejected',
      rejection_reason: reason,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}
