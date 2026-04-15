import { supabaseAdmin } from '@/lib/supabase/service-role'
import { AttendanceLog } from '@/types'

export async function getAttendanceLogs(filters?: {
  employeeId?: string
  date?: string
  status?: string
}) {
  let query = supabaseAdmin
    .from('attendance_logs')
    .select('*, employees(full_name, employee_number, departments(name))')
    .order('date', { ascending: false })

  if (filters?.employeeId) {
    query = query.eq('employee_id', filters.employeeId)
  }
  if (filters?.date) {
    query = query.eq('date', filters.date)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getTodayAttendance(employeeId: string) {
  const today = new Date().toISOString().split('T')[0]
  
  const { data, error } = await supabaseAdmin
    .from('attendance_logs')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('date', today)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function checkIn(employeeId: string, data?: {
  check_in_photo_url?: string
  location_in?: string
}) {
  const today = new Date().toISOString().split('T')[0]
  const now = new Date().toISOString()

  // Determine status: late if after 09:00
  const hour = new Date().getHours()
  const status = hour >= 9 ? 'late' : 'present'

  const { data: record, error } = await supabaseAdmin
    .from('attendance_logs')
    .upsert(
      {
        employee_id: employeeId,
        date: today,
        check_in: now,
        status,
        location_in: data?.location_in,
      },
      { onConflict: 'employee_id,date' }
    )
    .select()
    .single()

  if (error) throw error
  return record
}

export async function checkOut(employeeId: string, data?: {
  check_out_photo_url?: string
  location_out?: string
}) {
  const today = new Date().toISOString().split('T')[0]
  const now = new Date().toISOString()

  // Get current record to preserve check_in
  const existing = await getTodayAttendance(employeeId)

  const { data: record, error } = await supabaseAdmin
    .from('attendance_logs')
    .update({
      check_out: now,
    })
    .eq('employee_id', employeeId)
    .eq('date', today)
    .select()
    .single()

  if (error) throw error
  return record
}

export async function updateAttendanceStatus(
  id: string,
  status: 'present' | 'absent' | 'late' | 'excused'
) {
  const { data, error } = await supabaseAdmin
    .from('attendance_logs')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}
