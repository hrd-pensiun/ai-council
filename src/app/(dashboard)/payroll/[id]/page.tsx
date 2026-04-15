'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Loader2, Download, Printer } from 'lucide-react'
import { toast } from 'sonner'

interface PayrollDetail {
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
  processed_at: string
  paid_at: string
  created_at: string
  employees: {
    full_name: string
    employee_number: string
    email: string
    departments: { name: string }
    positions: { title: string }
  }
  payroll_details: {
    id: string
    amount: number
    payroll_components: {
      name: string
      code: string
      type: string
    }
  }[]
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  calculated: 'bg-blue-100 text-blue-800',
  approved: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
}

export default function PayrollDetailPage() {
  const params = useParams()
  const [payroll, setPayroll] = useState<PayrollDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const id = params.id as string
    if (id) fetchPayroll(id)
  }, [params.id])

  async function fetchPayroll(id: string) {
    setLoading(true)
    const { data, error } = await supabase
      .from('payroll_entries')
      .select(`
        *,
        employees(full_name, employee_number, email, departments(name), positions(title)),
        payroll_details(amount, payroll_components(name, code, type))
      `)
      .eq('id', id)
      .single()

    if (error || !data) {
      toast.error('Payroll not found')
      setLoading(false)
      return
    }

    setPayroll(data)
    setLoading(false)
  }

  async function handleUpdateStatus(status: string) {
    if (!payroll) return

    const updates: any = { status }
    if (status === 'approved') updates.processed_at = new Date().toISOString()
    if (status === 'paid') updates.paid_at = new Date().toISOString()

    const { error } = await supabase
      .from('payroll_entries')
      .update(updates)
      .eq('id', payroll.id)

    if (error) {
      toast.error(`Error: ${error.message}`)
    } else {
      toast.success(`Status updated to ${status}`)
      fetchPayroll(payroll.id)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!payroll) return null

  const earnings = payroll.payroll_details?.filter((d) => d.payroll_components?.type === 'earning') || []
  const deductions = payroll.payroll_details?.filter((d) => d.payroll_components?.type === 'deduction') || []

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/payroll">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Payroll
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {payroll.employees?.full_name || 'Employee'}
            </h1>
            <p className="text-slate-500">
              {MONTHS[payroll.payroll_month - 1]} {payroll.payroll_year} • {payroll.employees?.employee_number}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={statusColors[payroll.status]}>
              {payroll.status.toUpperCase()}
            </Badge>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Payslip */}
        <div className="lg:col-span-2 space-y-6">
          {/* Employee Info */}
          <Card>
            <CardHeader>
              <CardTitle>Employee Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-slate-500">Name</p>
                <p className="font-medium">{payroll.employees?.full_name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Employee ID</p>
                <p className="font-medium">{payroll.employees?.employee_number}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Department</p>
                <p className="font-medium">{payroll.employees?.departments?.name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Position</p>
                <p className="font-medium">{payroll.employees?.positions?.title}</p>
              </div>
            </CardContent>
          </Card>

          {/* Earnings */}
          <Card>
            <CardHeader>
              <CardTitle>Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full">
                <tbody>
                  {earnings.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-3">{item.payroll_components?.name}</td>
                      <td className="py-3 text-right text-green-600">
                        IDR {item.amount.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2">
                    <td className="pt-4 font-semibold">Total Earnings</td>
                    <td className="pt-4 text-right font-semibold text-green-600">
                      IDR {payroll.total_earnings.toLocaleString('id-ID')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Deductions */}
          <Card>
            <CardHeader>
              <CardTitle>Deductions</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full">
                <tbody>
                  {deductions.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-3">{item.payroll_components?.name}</td>
                      <td className="py-3 text-right text-red-600">
                        IDR {item.amount.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2">
                    <td className="pt-4 font-semibold">Total Deductions</td>
                    <td className="pt-4 text-right font-semibold text-red-600">
                      IDR {payroll.total_deductions.toLocaleString('id-ID')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-6">
          {/* Net Pay */}
          <Card className="bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-green-800">Net Pay</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-700">
                IDR {payroll.net_salary.toLocaleString('id-ID')}
              </p>
              <p className="text-sm text-green-600 mt-1">
                {payroll.status === 'paid' ? 'Paid' : payroll.status === 'approved' ? 'Ready to pay' : 'Pending'}
              </p>
            </CardContent>
          </Card>

          {/* Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Basic Salary</span>
                <span className="font-medium">IDR {payroll.basic_salary.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Earnings</span>
                <span className="font-medium text-green-600">+IDR {payroll.total_earnings.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Deductions</span>
                <span className="font-medium text-red-600">-IDR {payroll.total_deductions.toLocaleString('id-ID')}</span>
              </div>
              <div className="border-t pt-3 flex justify-between">
                <span className="font-semibold">Net Salary</span>
                <span className="font-bold text-green-700">IDR {payroll.net_salary.toLocaleString('id-ID')}</span>
              </div>
            </CardContent>
          </Card>

          {/* Tax Info */}
          <Card>
            <CardHeader>
              <CardTitle>Tax & Benefits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-500">PTKP Status</span>
                <span className="font-medium">{payroll.ptkp_status.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">PPh 21</span>
                <span className="font-medium">IDR {payroll.tax_amount.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">BPJS TK</span>
                <span className="font-medium">IDR {payroll.bpjs_tk.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">BPJS Kesehatan</span>
                <span className="font-medium">IDR {payroll.bpjs_kes.toLocaleString('id-ID')}</span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {payroll.status === 'calculated' && (
                <Button className="w-full" onClick={() => handleUpdateStatus('approved')}>
                  Approve Payroll
                </Button>
              )}
              {payroll.status === 'approved' && (
                <Button className="w-full" onClick={() => handleUpdateStatus('paid')}>
                  Mark as Paid
                </Button>
              )}
              {payroll.status === 'draft' && (
                <Button className="w-full" onClick={() => handleUpdateStatus('calculated')}>
                  Calculate
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
