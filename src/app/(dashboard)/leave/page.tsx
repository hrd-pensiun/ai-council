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
import { Plus, Loader2, Plane, Calendar, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { toast } from 'sonner'

interface LeaveRequest {
  id: string
  employee_id: string
  leave_type_id: string
  start_date: string
  end_date: string
  total_days: number
  reason: string
  status: string
  rejection_reason: string
  created_at: string
  employees: { full_name: string; employee_number: string }
  leave_types: { name: string; code: string }
}

interface LeaveBalance {
  id: string
  total_days: number
  used_days: number
  leave_types: { name: string; code: string }
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
}

export default function LeavePage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [statusFilter])

  async function fetchData() {
    setLoading(true)

    // Get current user
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setLoading(false)
      return
    }

    // Get employee record
    const { data: empData } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', userData.user.id)
      .single()

    if (!empData) {
      setLoading(false)
      return
    }

    // Fetch leave requests
    let query = supabase
      .from('leave_requests')
      .select('*, employees(full_name, employee_number), leave_types(name, code)')
      .order('created_at', { ascending: false })

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const { data: reqData } = await query
    setRequests(reqData || [])

    // Fetch balances
    const year = new Date().getFullYear()
    const { data: balData } = await supabase
      .from('leave_balances')
      .select('*, leave_types(name, code)')
      .eq('employee_id', empData.id)
      .eq('year', year)

    setBalances(balData || [])
    setLoading(false)
  }

  async function handleApprove(id: string) {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    const { data: empData } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', userData.user.id)
      .single()

    const { error } = await supabase
      .from('leave_requests')
      .update({
        status: 'approved',
        approved_by: empData?.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      toast.error(`Error: ${error.message}`)
    } else {
      toast.success('Leave approved')
      fetchData()
    }
  }

  async function handleReject(id: string) {
    const reason = prompt('Rejection reason (optional):')
    const { error } = await supabase
      .from('leave_requests')
      .update({
        status: 'rejected',
        rejection_reason: reason || null,
      })
      .eq('id', id)

    if (error) {
      toast.error(`Error: ${error.message}`)
    } else {
      toast.success('Leave rejected')
      fetchData()
    }
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leave Management</h1>
          <p className="text-slate-500">Request and manage leave</p>
        </div>
        <Link href="/leave/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Request Leave
          </Button>
        </Link>
      </div>

      {/* Leave Balances */}
      <div className="mb-6 grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        {balances.length === 0 ? (
          <Card className="md:col-span-3 lg:col-span-4">
            <CardContent className="pt-6 text-center text-slate-400">
              No leave balances yet. Request a leave to create balances automatically.
            </CardContent>
          </Card>
        ) : (
          balances.map((bal) => (
            <Card key={bal.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">
                  {bal.leave_types?.name || 'Unknown'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(bal.total_days - bal.used_days).toFixed(1)}
                  <span className="text-sm font-normal text-slate-400">
                    {' '}/ {bal.total_days} days
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {bal.used_days} used
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <span className="text-sm text-slate-500">
              {requests.length} request{requests.length !== 1 ? 's' : ''} found
            </span>
            <div className="flex-1" />
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || '')}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leave Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Requests</CardTitle>
          <CardDescription>Your leave application history</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Plane className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-lg font-medium">No leave requests</p>
              <p className="text-sm">Start by requesting a leave</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Plane className="h-4 w-4 text-slate-400" />
                        {req.leave_types?.name || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>
                          {format(new Date(req.start_date), 'd MMM', { locale: id })}
                          {' - '}
                          {format(new Date(req.end_date), 'd MMM yyyy', { locale: id })}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{req.total_days}</span>
                      <span className="text-slate-400 text-xs"> days</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[req.status]}>
                        {req.status}
                      </Badge>
                      {req.rejection_reason && (
                        <p className="text-xs text-red-500 mt-1">{req.rejection_reason}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-500 truncate max-w-[200px] block">
                        {req.reason || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {req.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReject(req.id)}
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(req.id)}
                          >
                            Approve
                          </Button>
                        </div>
                      )}
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
