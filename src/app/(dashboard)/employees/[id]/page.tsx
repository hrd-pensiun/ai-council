'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Loader2, User, Mail, Phone, MapPin, Building2, Calendar, Briefcase } from 'lucide-react'
import { toast } from 'sonner'

interface Department {
  id: string
  name: string
  code: string
}

interface Position {
  id: string
  title: string
  department_id: string
}

interface Employee {
  id: string
  employee_number: string
  full_name: string
  email: string
  phone: string
  address: string
  department_id: string
  position_id: string
  hire_date: string
  employment_status: string
  salary: number
  emergency_contact_name: string
  emergency_contact_phone: string
  departments: Department
  positions: Position
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  probation: 'bg-yellow-100 text-yellow-800',
  inactive: 'bg-gray-100 text-gray-800',
  terminated: 'bg-red-100 text-red-800',
}

export default function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    params.then((p) => {
      fetchEmployee(p.id)
    })
  }, [])

  async function fetchEmployee(id: string) {
    setLoading(true)
    const { data, error } = await supabase
      .from('employees')
      .select('*, departments(*), positions(*)')
      .eq('id', id)
      .single()

    if (error || !data) {
      toast.error('Employee not found')
      router.push('/employees')
      return
    }

    setEmployee(data)
    
    // Fetch departments for select
    const { data: deptData } = await supabase
      .from('departments')
      .select('*')
      .eq('is_active', true)
      .order('name')
    setDepartments(deptData || [])

    // Fetch positions for current department
    if (data.department_id) {
      const { data: posData } = await supabase
        .from('positions')
        .select('*')
        .eq('department_id', data.department_id)
        .eq('is_active', true)
        .order('title')
      setPositions(posData || [])
    }

    setLoading(false)
  }

  async function fetchPositions(departmentId: string | null) {
    if (!departmentId) return
    const { data } = await supabase
      .from('positions')
      .select('*')
      .eq('department_id', departmentId)
      .eq('is_active', true)
      .order('title')
    setPositions(data || [])
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!employee) return

    setSaving(true)
    const formData = new FormData(e.currentTarget)
    const updates = {
      full_name: formData.get('full_name') as string,
      phone: formData.get('phone') as string || null,
      address: formData.get('address') as string || null,
      department_id: formData.get('department_id') as string,
      position_id: formData.get('position_id') as string,
      employment_status: formData.get('employment_status') as string,
      salary: formData.get('salary') ? parseFloat(formData.get('salary') as string) : null,
      emergency_contact_name: formData.get('emergency_contact_name') as string || null,
      emergency_contact_phone: formData.get('emergency_contact_phone') as string || null,
    }

    const { error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', employee.id)

    if (error) {
      toast.error(`Error updating: ${error.message}`)
      setSaving(false)
      return
    }

    toast.success('Employee updated successfully!')
    setIsEditing(false)
    params.then((p) => fetchEmployee(p.id))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!employee) {
    return null
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/employees">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Employees
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{employee.full_name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <Badge className={statusColors[employee.employment_status]}>
                {employee.employment_status}
              </Badge>
              <span className="text-slate-500">{employee.employee_number}</span>
            </div>
          </div>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)}>Edit Employee</Button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Card */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Avatar & Quick Info */}
          <Card className="lg:col-span-1">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 mb-4">
                  <span className="text-3xl font-semibold text-slate-600">
                    {employee.full_name.charAt(0)}
                  </span>
                </div>
                <h2 className="text-xl font-semibold">{employee.full_name}</h2>
                <p className="text-slate-500">{employee.departments?.name || 'N/A'}</p>
                <p className="text-sm text-slate-400">{employee.positions?.title || 'N/A'}</p>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span className="truncate">{employee.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <span>{employee.phone || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <span className="truncate">{employee.address || 'N/A'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Employment Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="department_id">Department</Label>
                  {isEditing ? (
                    <Select
                      name="department_id"
                      defaultValue={employee.department_id}
                      onValueChange={(v) => fetchPositions(v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm">{employee.departments?.name || 'N/A'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position_id">Position</Label>
                  {isEditing ? (
                    <Select name="position_id" defaultValue={employee.position_id}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {positions.map((pos) => (
                          <SelectItem key={pos.id} value={pos.id}>
                            {pos.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm">{employee.positions?.title || 'N/A'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hire_date">Hire Date</Label>
                  {isEditing ? (
                    <Input
                      id="hire_date"
                      name="hire_date"
                      type="date"
                      defaultValue={employee.hire_date}
                      required
                    />
                  ) : (
                    <p className="text-sm">
                      {employee.hire_date
                        ? new Date(employee.hire_date).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          })
                        : 'N/A'}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employment_status">Status</Label>
                  {isEditing ? (
                    <Select name="employment_status" defaultValue={employee.employment_status}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="probation">Probation</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="terminated">Terminated</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={statusColors[employee.employment_status]}>
                      {employee.employment_status}
                    </Badge>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salary">Basic Salary</Label>
                  {isEditing ? (
                    <Input
                      id="salary"
                      name="salary"
                      type="number"
                      defaultValue={employee.salary || ''}
                      placeholder="15000000"
                    />
                  ) : (
                    <p className="text-sm">
                      {employee.salary
                        ? `IDR ${employee.salary.toLocaleString('id-ID')}`
                        : 'N/A'}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Emergency Contact</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Contact Name</Label>
                  {isEditing ? (
                    <Input
                      name="emergency_contact_name"
                      defaultValue={employee.emergency_contact_name || ''}
                      placeholder="Jane Doe"
                    />
                  ) : (
                    <p className="text-sm">{employee.emergency_contact_name || 'N/A'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Contact Phone</Label>
                  {isEditing ? (
                    <Input
                      name="emergency_contact_phone"
                      defaultValue={employee.emergency_contact_phone || ''}
                      placeholder="+62 812 3456 7890"
                    />
                  ) : (
                    <p className="text-sm">{employee.emergency_contact_phone || 'N/A'}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {isEditing && (
              <div className="flex justify-end gap-4">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
