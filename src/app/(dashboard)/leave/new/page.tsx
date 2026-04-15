'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Loader2, Calendar } from 'lucide-react'
import { format, differenceInBusinessDays, addDays } from 'date-fns'
import { id } from 'date-fns/locale'
import { toast } from 'sonner'

interface LeaveType {
  id: string
  name: string
  code: string
  default_days_per_year: number
  is_paid: boolean
}

interface LeaveBalance {
  id: string
  total_days: number
  used_days: number
  leave_type_id: string
  leave_types: { name: string; code: string }
}

export default function NewLeavePage() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [loading, setLoading] = useState(false)
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: '',
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    // Get current user
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    // Get employee record
    const { data: empData } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', userData.user.id)
      .single()

    if (!empData) {
      toast.error('Employee record not found')
      return
    }
    setEmployeeId(empData.id)

    // Get leave types
    const { data: typesData } = await supabase
      .from('leave_types')
      .select('*')
      .eq('is_active', true)
      .order('name')
    setLeaveTypes(typesData || [])

    // Get current year balances
    const year = new Date().getFullYear()
    const { data: balData } = await supabase
      .from('leave_balances')
      .select('*, leave_types(name, code)')
      .eq('employee_id', empData.id)
      .eq('year', year)
    setBalances(balData || [])
  }

  function calculateDays() {
    if (!formData.start_date || !formData.end_date) return 0
    const start = new Date(formData.start_date)
    const end = new Date(formData.end_date)
    if (end < start) return 0
    return differenceInBusinessDays(end, start) + 1
  }

  function getRemainingDays() {
    if (!formData.leave_type_id) return 0
    const balance = balances.find((b) => b.leave_type_id === formData.leave_type_id)
    if (!balance) return 0
    return balance.total_days - balance.used_days
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!employeeId) {
      toast.error('Employee record not found')
      return
    }

    const days = calculateDays()
    if (days <= 0) {
      toast.error('Invalid date range')
      return
    }

    const remaining = getRemainingDays()
    if (remaining < days) {
      toast.error(`Insufficient leave balance. Available: ${remaining} days`)
      return
    }

    setLoading(true)

    const { error } = await supabase.from('leave_requests').insert({
      employee_id: employeeId,
      leave_type_id: formData.leave_type_id,
      start_date: formData.start_date,
      end_date: formData.end_date,
      total_days: days,
      reason: formData.reason,
      status: 'pending',
    })

    if (error) {
      toast.error(`Error: ${error.message}`)
      setLoading(false)
      return
    }

    toast.success('Leave request submitted!')
    router.push('/leave')
    router.refresh()
  }

  const days = calculateDays()
  const remaining = getRemainingDays()

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/leave">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Leave
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Request Leave</h1>
        <p className="text-slate-500">Submit a new leave application</p>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Leave Type */}
          <Card>
            <CardHeader>
              <CardTitle>Leave Type</CardTitle>
              <CardDescription>Select the type of leave</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="leave_type_id">Type</Label>
                <Select
                  value={formData.leave_type_id}
                  onValueChange={(v) => setFormData({ ...formData, leave_type_id: v || '' })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map((type) => {
                      const bal = balances.find((b) => b.leave_type_id === type.id)
                      const rem = bal ? bal.total_days - bal.used_days : type.default_days_per_year
                      return (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name} ({rem} days remaining)
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              {remaining > 0 && (
                <div className="rounded-lg bg-slate-50 p-3 text-sm">
                  <p>
                    Remaining: <strong>{remaining}</strong> days for this year
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Date Range */}
          <Card>
            <CardHeader>
              <CardTitle>Date Range</CardTitle>
              <CardDescription>Select start and end dates</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  min={formData.start_date || format(new Date(), 'yyyy-MM-dd')}
                  required
                />
              </div>

              {days > 0 && (
                <div className="md:col-span-2 rounded-lg bg-blue-50 p-3 flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">
                      {days} business day{days !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-blue-600">
                      {formData.start_date && formData.end_date
                        ? `${format(new Date(formData.start_date), 'd MMM', { locale: id })} - ${format(new Date(formData.end_date), 'd MMM yyyy', { locale: id })}`
                        : ''}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reason */}
          <Card>
            <CardHeader>
              <CardTitle>Reason</CardTitle>
              <CardDescription>Explain why you need leave (optional)</CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Enter reason for leave..."
                rows={4}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </CardContent>
          </Card>

          {/* Validation Warning */}
          {formData.leave_type_id && days > remaining && (
            <div className="rounded-lg bg-red-50 p-4 text-red-700 text-sm">
              <strong>Warning:</strong> You are requesting {days} days but only {remaining} days remaining.
              Your request may be rejected.
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Link href="/leave">
              <Button variant="outline" type="button">Cancel</Button>
            </Link>
            <Button type="submit" disabled={loading || days <= 0}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Request
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
