// ============================================
// W SYSTEM - HRIS Type Definitions
// ============================================

export type UserRole = 'admin' | 'hr' | 'employee'

export type EmploymentStatus = 'active' | 'inactive' | 'probation' | 'terminated'

// ---------------------------------------------------
// User & Auth
// ---------------------------------------------------
export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url?: string
  created_at: string
  updated_at: string
}

// ---------------------------------------------------
// Organization Structure
// ---------------------------------------------------
export interface Department {
  id: string
  name: string
  code: string
  parent_id?: string
  head_user_id?: string
  created_at: string
}

export interface Position {
  id: string
  title: string
  department_id: string
  level: number // 1=staff, 2=supervisor, 3=manager, 4=director
  created_at: string
}

// ---------------------------------------------------
// Employee
// ---------------------------------------------------
export interface Employee {
  id: string
  user_id?: string
  employee_number: string
  full_name: string
  email: string
  phone?: string
  address?: string
  department_id: string
  position_id: string
  hire_date: string
  employment_status: EmploymentStatus
  salary?: number
  emergency_contact_name?: string
  emergency_contact_phone?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

// ---------------------------------------------------
// Attendance
// ---------------------------------------------------
export interface AttendanceLog {
  id: string
  employee_id: string
  date: string
  check_in?: string
  check_out?: string
  check_in_photo_url?: string
  check_out_photo_url?: string
  location_in?: string
  location_out?: string
  status?: 'present' | 'absent' | 'late' | 'excused'
  notes?: string
  created_at: string
  employees?: {
    full_name: string
    employee_number: string
    departments?: { name: string }
  }
}

export interface AttendanceRecord {
  id: string
  employee_id: string
  date: string
  check_in?: string
  check_out?: string
  check_in_photo_url?: string
  check_out_photo_url?: string
  location_in?: string
  location_out?: string
  notes?: string
  created_at: string
}

export interface AttendanceSummary {
  employee_id: string
  month: number
  year: number
  total_present: number
  total_absent: number
  total_late: number
  total_hours: number
}

// Work hours config
export const WORK_HOURS = {
  start: '09:00',
  end: '17:00',
  grace_minutes: 15,
} as const

// ---------------------------------------------------
// Leave Management
// ---------------------------------------------------
export type LeaveType = 'annual' | 'sick' | 'emergency' | 'maternity' | 'paternity' | 'unpaid'

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export interface LeaveRequest {
  id: string
  employee_id: string
  leave_type: LeaveType
  start_date: string
  end_date: string
  total_days: number
  reason?: string
  status: LeaveStatus
  approved_by?: string
  approved_at?: string
  rejection_reason?: string
  created_at: string
}

export interface LeaveBalance {
  id: string
  employee_id: string
  leave_type: LeaveType
  year: number
  total_days: number
  used_days: number
  remaining_days: number
}

// ---------------------------------------------------
// Payroll
// ---------------------------------------------------
export type SalaryComponentType = 'earning' | 'deduction'

export interface SalaryComponent {
  id: string
  name: string
  code: string
  type: SalaryComponentType
  is_taxable: boolean
  is_default: boolean
  created_at: string
}

export interface PayrollEntry {
  id: string
  employee_id: string
  payroll_month: number
  payroll_year: number
  basic_salary: number
  total_earnings: number
  total_deductions: number
  net_salary: number
  status: 'draft' | 'processed' | 'paid'
  processed_by?: string
  processed_at?: string
  created_at: string
}

export interface PayrollDetail {
  id: string
  payroll_id: string
  component_id: string
  amount: number
  component_type: SalaryComponentType
}

// ---------------------------------------------------
// Dashboard Stats
// ---------------------------------------------------
export interface DashboardStats {
  total_employees: number
  active_employees: number
  on_leave_today: number
  attendance_today: {
    present: number
    absent: number
    late: number
  }
  pending_leave_requests: number
  payroll_this_month: {
    total_employees: number
    total_net_salary: number
  }
}
