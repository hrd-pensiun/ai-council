import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  CalendarClock,
  Plane,
  Wallet,
  TrendingUp,
  Clock,
  AlertCircle,
} from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Fetch stats in parallel
  const [
    { count: totalEmployees },
    { count: activeEmployees },
    { data: todayAttendance },
    { count: pendingLeaves },
  ] = await Promise.all([
    supabase.from('employees').select('*', { count: 'exact', head: true }),
    supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('employment_status', 'active'),
    supabase
      .from('attendance_logs')
      .select('*, employees(full_name)')
      .eq('date', new Date().toISOString().split('T')[0]),
    supabase
      .from('leave_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
  ])

  // Count today's attendance
  const presentToday = todayAttendance?.filter((a) => a.status === 'present').length ?? 0
  const absentToday = todayAttendance?.filter((a) => a.status === 'absent').length ?? 0
  const lateToday = todayAttendance?.filter((a) => a.status === 'late').length ?? 0

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500">Welcome to W SYSTEM HRIS</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Total Employees
            </CardTitle>
            <Users className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployees ?? 0}</div>
            <p className="text-xs text-slate-400">
              {activeEmployees ?? 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Present Today
            </CardTitle>
            <CalendarClock className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{presentToday}</div>
            <div className="flex gap-2 text-xs text-slate-400">
              {lateToday > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {lateToday} late
                </Badge>
              )}
              {absentToday > 0 && (
                <Badge variant="outline" className="text-xs">
                  {absentToday} absent
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              On Leave
            </CardTitle>
            <Plane className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingLeaves ?? 0}</div>
            <p className="text-xs text-slate-400">pending requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Payroll This Month
            </CardTitle>
            <Wallet className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeEmployees ?? 0}
            </div>
            <p className="text-xs text-slate-400">active employees</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <QuickActionCard
            title="Add Employee"
            description="Register new employee"
            href="/employees/new"
            icon={Users}
          />
          <QuickActionCard
            title="Record Attendance"
            description="Check-in / Check-out"
            href="/attendance"
            icon={Clock}
          />
          <QuickActionCard
            title="Request Leave"
            description="Submit leave application"
            href="/leave/new"
            icon={Plane}
          />
          <QuickActionCard
            title="Run Payroll"
            description="Process monthly payroll"
            href="/payroll"
            icon={Wallet}
          />
        </div>
      </div>

      {/* Recent Activity / Today's Attendance */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            {todayAttendance && todayAttendance.length > 0 ? (
              <div className="space-y-3">
                {todayAttendance.slice(0, 5).map((record: any) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                        <span className="text-xs font-medium text-slate-600">
                          {(record.employees?.full_name || 'U')[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {record.employees?.full_name || 'Unknown'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {record.check_in
                            ? new Date(record.check_in).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'No check-in'}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        record.status === 'present'
                          ? 'default'
                          : record.status === 'late'
                          ? 'destructive'
                          : 'secondary'
                      }
                      className="text-xs"
                    >
                      {record.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                <CalendarClock className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No attendance records today</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending Leave Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingLeaves && pendingLeaves > 0 ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <AlertCircle className="mx-auto h-8 w-8 text-amber-500 mb-2" />
                  <p className="text-2xl font-bold">{pendingLeaves}</p>
                  <p className="text-sm text-slate-500">pending requests</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                <Plane className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No pending leave requests</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function QuickActionCard({
  title,
  description,
  href,
  icon: Icon,
}: {
  title: string
  description: string
  href: string
  icon: React.ElementType
}) {
  return (
    <a
      href={href}
      className="flex flex-col items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 text-center transition-colors hover:bg-slate-50"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
        <Icon className="h-5 w-5 text-blue-600" />
      </div>
      <div>
        <p className="font-medium text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
    </a>
  )
}
