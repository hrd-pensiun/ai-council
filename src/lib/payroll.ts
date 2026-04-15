import { supabaseAdmin } from '@/lib/supabase/service-role'

export interface PayrollComponent {
  id: string
  name: string
  code: string
  type: 'earning' | 'deduction'
  is_taxable: boolean
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
  ptkp_status: string
  tax_amount: number
  bpjs_tk: number
  bpjs_kes: number
  status: string
}

// PTKP rates (2024)
const PTKP_RATES: Record<string, number> = {
  tk0: 54000000,
  tk1: 58500000,
  tk2: 63000000,
  tk3: 67500000,
  k0: 58500000,
  k1: 63000000,
  k2: 67500000,
  k3: 72000000,
}

// Simplified PPh 21 calculation (monthly)
function calculatePPh21(taxableIncome: number, ptkpStatus: string): number {
  if (taxableIncome <= 0) return 0
  
  const ptkp = PTKP_RATES[ptkpStatus] || PTKP_RATES['tk0']
  const annualIncome = taxableIncome * 12
  const taxable = Math.max(0, annualIncome - ptkp)
  
  // Progressive tax rates (2024)
  let tax = 0
  if (taxable <= 60000000) {
    tax = taxable * 0.05
  } else if (taxable <= 250000000) {
    tax = 3000000 + (taxable - 60000000) * 0.15
  } else if (taxable <= 500000000) {
    tax = 3000000 + 28500000 + (taxable - 250000000) * 0.25
  } else if (taxable <= 5000000000) {
    tax = 3000000 + 28500000 + 62500000 + (taxable - 500000000) * 0.30
  } else {
    tax = 3000000 + 28500000 + 62500000 + 1350000000 + (taxable - 5000000000) * 0.35
  }
  
  return Math.round(tax / 12)
}

export async function getPayrollComponents() {
  const { data, error } = await supabaseAdmin
    .from('payroll_components')
    .select('*')
    .eq('is_active', true)
    .order('type', { ascending: false })
  if (error) throw error
  return data
}

export async function getPayrollEntries(filters?: {
  employeeId?: string
  month?: number
  year?: number
  status?: string
}) {
  let query = supabaseAdmin
    .from('payroll_entries')
    .select('*, employees(full_name, employee_number, departments(name))')
    .order('payroll_year', { ascending: false })
    .order('payroll_month', { ascending: false })

  if (filters?.employeeId) {
    query = query.eq('employee_id', filters.employeeId)
  }
  if (filters?.month) {
    query = query.eq('payroll_month', filters.month)
  }
  if (filters?.year) {
    query = query.eq('payroll_year', filters.year)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getPayrollEntry(id: string) {
  const { data, error } = await supabaseAdmin
    .from('payroll_entries')
    .select('*, employees(*), payroll_details(*, payroll_components(*))')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function runPayroll(month: number, year: number) {
  // Get all active employees
  const { data: employees, error: empError } = await supabaseAdmin
    .from('employees')
    .select('*, departments(*), positions(*)')
    .eq('employment_status', 'active')
    .eq('is_active', true)

  if (empError) throw empError

  const results = []

  for (const emp of employees) {
    // Check if payroll already exists
    const { data: existing } = await supabaseAdmin
      .from('payroll_entries')
      .select('id')
      .eq('employee_id', emp.id)
      .eq('payroll_month', month)
      .eq('payroll_year', year)
      .single()

    if (existing) {
      results.push({ employee: emp.full_name, status: 'skipped', reason: 'Already exists' })
      continue
    }

    // Calculate payroll components
    const basicSalary = emp.salary || 0

    // Default earnings
    const earnings = basicSalary

    // Default deductions
    const bpjsTk = Math.min(basicSalary * 0.02, 150000) // 2% max 150k
    const bpjsKes = Math.min(basicSalary * 0.01, 80000) // 1% max 80k

    // Taxable income
    const taxableIncome = Math.max(0, earnings - bpjsTk - bpjsKes)

    // PPh 21 (simplified - assume tk0)
    const taxAmount = calculatePPh21(taxableIncome, 'tk0')

    // Total deductions
    const totalDeductions = bpjsTk + bpjsKes + taxAmount

    // Net salary
    const netSalary = earnings - totalDeductions

    // Create payroll entry
    const { data: payroll, error: payrollError } = await supabaseAdmin
      .from('payroll_entries')
      .insert({
        employee_id: emp.id,
        payroll_month: month,
        payroll_year: year,
        basic_salary: basicSalary,
        total_earnings: earnings,
        total_deductions: totalDeductions,
        net_salary: netSalary,
        ptkp_status: 'tk0',
        tax_amount: taxAmount,
        bpjs_tk: bpjsTk,
        bpjs_kes: bpjsKes,
        status: 'calculated',
      })
      .select()
      .single()

    if (payrollError) {
      results.push({ employee: emp.full_name, status: 'error', reason: payrollError.message })
      continue
    }

    // Add default payroll details
    await supabaseAdmin.from('payroll_details').insert([
      { payroll_id: payroll.id, component_id: (await getComponentId('basic_salary')), amount: basicSalary },
      { payroll_id: payroll.id, component_id: (await getComponentId('bpjs_tk')), amount: bpjsTk },
      { payroll_id: payroll.id, component_id: (await getComponentId('bpjs_kes')), amount: bpjsKes },
      { payroll_id: payroll.id, component_id: (await getComponentId('pph21')), amount: taxAmount },
    ])

    results.push({ employee: emp.full_name, status: 'success', payrollId: payroll.id })
  }

  return results
}

async function getComponentId(code: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('payroll_components')
    .select('id')
    .eq('code', code)
    .single()
  return data?.id || null
}

export async function updatePayrollStatus(id: string, status: 'draft' | 'calculated' | 'approved' | 'paid') {
  const updates: any = { status }
  if (status === 'approved') {
    updates.processed_at = new Date().toISOString()
  }
  if (status === 'paid') {
    updates.paid_at = new Date().toISOString()
  }

  const { data, error } = await supabaseAdmin
    .from('payroll_entries')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}
