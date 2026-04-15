'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { format, addDays, subDays } from 'date-fns'
import { id } from 'date-fns/locale'
import {
  Clock,
  LogIn,
  LogOut,
  Loader2,
  CalendarDays,
} from 'lucide-react'
import { toast } from 'sonner'
import { ErrorState, LoadingState } from '@/components/ui/error-state'

interface AttendanceLog {
  id: string
  employee_id: string
  date: string
  check_in: string
  check_out: string
  status: string
  location_in: string
  employees: {
    full_name: string
    employee_number: string
    departments: { name: string }
  }
}

const statusColors: Record<string, string> = {
  present: 'bg-green-100 text-green-800',
  late: 'bg-yellow-100 text-yellow-800',
  absent: 'bg-red-100 text-red-800',
  excused: 'bg-blue-100 text-blue-800',
}

export default function AttendancePage() {
  const [logs, setLogs] = useState<AttendanceLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [statusFilter, setStatusFilter] = useState('')
  const [todayRecord, setTodayRecord] = useState<AttendanceLog | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchAttendance()
    fetchTodayRecord()
  }, [selectedDate, statusFilter])

  async function fetchTodayRecord() {
    const today = format(new Date(), 'yyyy-MM-dd')
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    // Get employee_id for current user
    const { data: empData } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', userData.user.id)
      .single()

    if (!empData) return

    const { data } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('employee_id', empData.id)
      .eq('date', today)
      .single()

    setTodayRecord(data)
  }

  async function fetchAttendance() {
    setLoading(true)
    setError(null)
    const dateStr = format(selectedDate, 'yyyy-MM-dd')

    let query = supabase
      .from('attendance_logs')
      .select('*, employees(full_name, employee_number, departments(name))')
      .eq('date', dateStr)
      .order('check_in', { ascending: true })

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const { data, error: err } = await query
    if (err) {
      setError(err.message)
      console.error('Error fetching attendance:', err)
    } else {
      setLogs(data || [])
    }
    setLoading(false)
  }

  async function handleCheckIn() {
    setSaving(true)
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      toast.error('Not authenticated')
      setSaving(false)
      return
    }

    // Get employee_id
    const { data: empData, error: empErr } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', userData.user.id)
      .single()

    if (empErr || !empData) {
      toast.error('Employee record not found')
      setSaving(false)
      return
    }

    const { error } = await supabase.from('attendance_logs').upsert({
      employee_id: empData.id,
      date: format(new Date(), 'yyyy-MM-dd'),
      check_in: new Date().toISOString(),
      status: new Date().getHours() >= 9 ? 'late' : 'present',
    }, { onConflict: 'employee_id,date' })

    if (error) {
      toast.error(`Check-in failed: ${error.message}`)
    } else {
      toast.success('Check-in recorded!')
      fetchAttendance()
      fetchTodayRecord()
    }
    setSaving(false)
  }

  async function handleCheckOut() {
    setSaving(true)
    if (!todayRecord) {
      toast.error('Please check in first')
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from('attendance_logs')
      .update({ check_out: new Date().toISOString() })
      .eq('id', todayRecord.id)

    if (error) {
      toast.error(`Check-out failed: ${error.message}`)
    } else {
      toast.success('Check-out recorded!')
      fetchAttendance()
      fetchTodayRecord()
    }
    setSaving(false)
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
          <p className="text-slate-500">Track check-in and check-out</p>
        </div>
      </div>

      {/* Check In/Out Card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            {/* Date Navigation */}
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedDate(subDays(selectedDate, 1))}
              >
                ‹
              </Button>
              <Input
                type="date"
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={(e) => setSelectedDate(new Date(e.target.value + 'T00:00:00'))}
                className="w-auto"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              >
                ›
              </Button>
            </div>

            {/* Today's Status / Check In-Out */}
            <div className="flex items-center gap-3">
              {todayRecord ? (
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium">Checked In</p>
                    <p className="text-xs text-slate-500">
                      {todayRecord.check_in
                        ? format(new Date(todayRecord.check_in), 'HH:mm')
                        : '-'}
                    </p>
                  </div>
                  {todayRecord.check_out ? (
                    <div className="text-right">
                      <p className="text-sm font-medium">Checked Out</p>
                      <p className="text-xs text-slate-500">
                        {format(new Date(todayRecord.check_out), 'HH:mm')}
                      </p>
                    </div>
                  ) : (
                    <Button onClick={handleCheckOut} disabled={saving}>
                      {saving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <LogOut className="mr-2 h-4 w-4" />
                      )}
                      Check Out
                    </Button>
                  )}
                </div>
              ) : (
                <Button onClick={handleCheckIn} disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="mr-2 h-4 w-4" />
                  )}
                  Check In
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <span className="text-sm text-slate-500">
              Showing attendance for{' '}
              <strong>{format(selectedDate, 'd MMMM yyyy', { locale: id })}</strong>
            </span>
            <div className="flex-1" />
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || '')}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="excused">Excused</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
          <CardDescription>
            {logs.length} record{logs.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState message="Loading attendance..." />
          ) : error ? (
            <ErrorState
              title="Failed to load attendance"
              message={error}
              onRetry={fetchAttendance}
              loading={loading}
            />
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <CalendarDays className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-lg font-medium">No attendance records</p>
              <p className="text-sm">No one has checked in on this date</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{log.employees?.full_name || 'Unknown'}</p>
                        <p className="text-xs text-slate-500">{log.employees?.employee_number || '-'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {log.employees?.departments?.name || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {log.check_in ? (
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {format(new Date(log.check_in), 'HH:mm')}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {log.check_out ? (
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {format(new Date(log.check_out), 'HH:mm')}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[log.status] || ''}>
                        {log.status}
                      </Badge>
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
