'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { Plus, Search } from 'lucide-react'
import { ErrorState, LoadingState } from '@/components/ui/error-state'

interface Employee {
  id: string
  employee_number: string
  full_name: string
  email: string
  phone: string
  department_id: string
  departments: { name: string; code: string }
  positions: { title: string }
  employment_status: string
  hire_date: string
}

interface Department {
  id: string
  name: string
  code: string
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  probation: 'bg-yellow-100 text-yellow-800',
  inactive: 'bg-gray-100 text-gray-800',
  terminated: 'bg-red-100 text-red-800',
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const supabase = createClient()

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentFilter, statusFilter])

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('employees')
        .select('*, departments(name, code), positions(title)')
        .order('full_name')

      if (departmentFilter) {
        query = query.eq('department_id', departmentFilter)
      }
      if (statusFilter) {
        query = query.eq('employment_status', statusFilter)
      }
      if (search) {
        query = query.or(
          `full_name.ilike.%${search}%,employee_number.ilike.%${search}%,email.ilike.%${search}%`
        )
      }

      const { data: empData, error: empErr } = await query
      if (empErr) throw new Error(empErr.message)
      setEmployees(empData || [])

      const { data: deptData, error: deptErr } = await supabase
        .from('departments')
        .select('*')
        .eq('is_active', true)
        .order('name')
      if (deptErr) throw new Error(deptErr.message)
      setDepartments(deptData || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load employees'
      setError(message)
      console.error('Error fetching employees:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    fetchData()
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Employees</h1>
          <p className="text-slate-500">Manage employee records</p>
        </div>
        <Link href="/employees/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by name, employee number, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={departmentFilter} onValueChange={(v) => setDepartmentFilter(v || '')}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || '')}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="probation">Probation</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Employee List</CardTitle>
          <CardDescription>
            {employees.length} employee{employees.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState message="Loading employees..." />
          ) : error ? (
            <ErrorState
              title="Failed to load employees"
              message={error}
              onRetry={fetchData}
              loading={loading}
            />
          ) : employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <p className="text-lg font-medium">No employees found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Hire Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{emp.full_name}</p>
                        <p className="text-sm text-slate-500">{emp.employee_number}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{emp.departments?.name || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell>{emp.positions?.title || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[emp.employment_status] || ''}>
                        {emp.employment_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {emp.hire_date
                        ? new Date(emp.hire_date).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/employees/${emp.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
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
