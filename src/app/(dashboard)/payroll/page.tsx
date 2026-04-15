'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Loader2, Wallet, CheckCircle, XCircle, Eye } from 'lucide-react'
import { toast } from 'sonner'

interface PayrollEntry {
  id: string
  employee_id: string
  payroll_month: number
  payroll_year: number
  basic_salary: number
  total_earnings: number
  total_deductions: number
  net_salary: number
  status: string
  created_at: string
  employees: { full_name: string; employee_number: string; departments: { name: string } }
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  calculated: 'bg-blue-100 text-blue-800',
  approved: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function PayrollPage() {
  const [entries, setEntries] = useState<PayrollEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [monthFilter, setMonthFilter] = useState('')
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString())
  const [openRunDialog, setOpenRunDialog] = useState(false)
  const [runForm, setRunForm] = useState({ month: (new Date().getMonth() + 1).toString(), year: new Date().getFullYear().toString() })
  const supabase = createClient()

  useEffect(() => {
    fetchPayroll()
  }, [monthFilter, yearFilter])

  async function fetchPayroll() {
    setLoading(true)
    let query = supabase
      .from('payroll_entries')
      .select('*, employees(full_name, employee_number, departments(name))')
      .order('payroll_year', { ascending: false })
      .order('payroll_month', { ascending: false })

    if (yearFilter) {
      query = query.eq('payroll_year', parseInt(yearFilter))
    }
    if (monthFilter) {
      query = query.eq('payroll_month', parseInt(monthFilter))
    }

    const { data } = await query
    setEntries(data || [])
    setLoading(false)
  }

  async function handleRunPayroll() {
    setRunning(true)
    try {
      const res = await fetch('/api/payroll/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: parseInt(runForm.month),
          year: parseInt(runForm.year),
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        toast.error(result.error || 'Failed to run payroll')
      } else {
        const success = result.results.filter((r: any) => r.status === 'success').length
        const skipped = result.results.filter((r: any) => r.status === 'skipped').length
        toast.success(`Payroll run: ${success} processed, ${skipped} skipped`)
        setOpenRunDialog(false)
        fetchPayroll()
      }
    } catch (err: any) {
      toast.error(err.message)
    }
    setRunning(false)
  }

  async function handleUpdateStatus(id: string, status: string) {
    const { error } = await supabase
      .from('payroll_entries')
      .update({ status })
      .eq('id', id)

    if (error) {
      toast.error(`Error: ${error.message}`)
    } else {
      toast.success(`Status updated to ${status}`)
      fetchPayroll()
    }
  }

  // Calculate totals
  const totals = entries.reduce((acc, e) => ({
    earnings: acc.earnings + e.total_earnings,
    deductions: acc.deductions + e.total_deductions,
    net: acc.net + e.net_salary,
    count: acc.count + 1,
  }), { earnings: 0, deductions: 0, net: 0, count: 0 })

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payroll</h1>
          <p className="text-slate-500">Run and manage monthly payroll</p>
        </div>
        <Dialog>
          <DialogTrigger onClick={() => setOpenRunDialog(true)}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Run Payroll
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Run Monthly Payroll</DialogTitle>
              <DialogDescription>
                Calculate payroll for all active employees. Existing entries will be skipped.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="month">Month</Label>
                <Select value={runForm.month} onValueChange={(v) => setRunForm({ ...runForm, month: v || '1' })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="year">Year</Label>
                <Select value={runForm.year} onValueChange={(v) => setRunForm({ ...runForm, year: v || runForm.year })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenRunDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleRunPayroll} disabled={running}>
                {running && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Run Now
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              IDR {totals.earnings.toLocaleString('id-ID')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Deductions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              IDR {totals.deductions.toLocaleString('id-ID')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Net Pay</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              IDR {totals.net.toLocaleString('id-ID')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <span className="text-sm text-slate-500">
              {entries.length} payroll record{entries.length !== 1 ? 's' : ''} found
            </span>
            <div className="flex-1" />
            <Select value={monthFilter} onValueChange={(v) => { setMonthFilter(v || ''); }}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="All Months" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Months</SelectItem>
                {MONTHS.map((m, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={(v) => { setYearFilter(v || ''); }}>
              <SelectTrigger className="w-full md:w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payroll Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll Records</CardTitle>
          <CardDescription>Monthly payroll entries</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Wallet className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-lg font-medium">No payroll records</p>
              <p className="text-sm">Run payroll to create entries</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Basic Salary</TableHead>
                  <TableHead>Earnings</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net Pay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{entry.employees?.full_name || 'Unknown'}</p>
                        <p className="text-xs text-slate-500">{entry.employees?.employee_number || '-'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {MONTHS[entry.payroll_month - 1]} {entry.payroll_year}
                    </TableCell>
                    <TableCell>
                      IDR {entry.basic_salary.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="text-green-600">
                      IDR {entry.total_earnings.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="text-red-600">
                      IDR {entry.total_deductions.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="font-medium">
                      IDR {entry.net_salary.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[entry.status]}>
                        {entry.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/payroll/${entry.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        {entry.status === 'calculated' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUpdateStatus(entry.id, 'approved')}
                            >
                              <CheckCircle className="h-4 w-4 text-yellow-600" />
                            </Button>
                          </>
                        )}
                        {entry.status === 'approved' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUpdateStatus(entry.id, 'paid')}
                          >
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
