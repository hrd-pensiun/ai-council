import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { month, year } = await request.json()

    if (!month || !year) {
      return NextResponse.json({ error: 'Month and year required' }, { status: 400 })
    }

    // Import server-side payroll function
    const { supabaseAdmin } = await import('@/lib/supabase/service-role')

    // Get all active employees
    const { data: employees, error: empError } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('employment_status', 'active')
      .eq('is_active', true)

    if (empError) {
      return NextResponse.json({ error: empError.message }, { status: 500 })
    }

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

      // Calculate payroll
      const basicSalary = emp.salary || 0

      // Default deductions (2024 rates)
      const bpjsTk = Math.min(basicSalary * 0.02, 150000) // 2% max 150k
      const bpjsKes = Math.min(basicSalary * 0.01, 80000) // 1% max 80k

      // Taxable income
      const taxableIncome = Math.max(0, basicSalary - bpjsTk - bpjsKes)

      // PPh 21 (simplified)
      const ptkp = 54000000 // TK0
      const annualTaxable = Math.max(0, taxableIncome * 12 - ptkp)
      let annualTax = 0
      if (annualTaxable <= 60000000) {
        annualTax = annualTaxable * 0.05
      } else if (annualTaxable <= 250000000) {
        annualTax = 3000000 + (annualTaxable - 60000000) * 0.15
      } else if (annualTaxable <= 500000000) {
        annualTax = 3000000 + 28500000 + (annualTaxable - 250000000) * 0.25
      } else {
        annualTax = 3000000 + 28500000 + 62500000 + (annualTaxable - 500000000) * 0.30
      }
      const taxAmount = Math.round(annualTax / 12)

      // Total
      const totalDeductions = bpjsTk + bpjsKes + taxAmount
      const netSalary = basicSalary - totalDeductions

      // Create payroll entry
      const { data: payroll, error: payrollError } = await supabaseAdmin
        .from('payroll_entries')
        .insert({
          employee_id: emp.id,
          payroll_month: month,
          payroll_year: year,
          basic_salary: basicSalary,
          total_earnings: basicSalary,
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

      // Get component IDs
      const { data: compData } = await supabaseAdmin
        .from('payroll_components')
        .select('id, code')

      const compMap: Record<string, string> = {}
      compData?.forEach((c: any) => { compMap[c.code] = c.id })

      // Insert payroll details
      await supabaseAdmin.from('payroll_details').insert([
        { payroll_id: payroll.id, component_id: compMap['basic_salary'], amount: basicSalary },
        { payroll_id: payroll.id, component_id: compMap['bpjs_tk'], amount: bpjsTk },
        { payroll_id: payroll.id, component_id: compMap['bpjs_kes'], amount: bpjsKes },
        { payroll_id: payroll.id, component_id: compMap['pph21'], amount: taxAmount },
      ])

      results.push({ employee: emp.full_name, status: 'success', payrollId: payroll.id })
    }

    return NextResponse.json({ results })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
