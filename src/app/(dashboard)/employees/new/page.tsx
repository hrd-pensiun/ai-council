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
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { ErrorState, LoadingState } from '@/components/ui/error-state'

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

export default function NewEmployeePage() {
  const [loading, setLoading] = useState(false)
  const [loadingDeps, setLoadingDeps] = useState(true)
  const [departments, setDepartments] = useState<Department[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [employeeNumber, setEmployeeNumber] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchDepartments()
    generateEmployeeNumber()
  }, [])

  async function fetchDepartments() {
    try {
      const { data, error: err } = await supabase
        .from('departments')
        .select('*')
        .eq('is_active', true)
        .order('name')
      if (err) throw new Error(err.message)
      setDepartments(data || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load departments'
      setError(message)
      console.error('Error fetching departments:', err)
    } finally {
      setLoadingDeps(false)
    }
  }

  async function fetchPositions(departmentId: string | null) {
    if (!departmentId) {
      setPositions([])
      return
    }
    const { data } = await supabase
      .from('positions')
      .select('*')
      .eq('department_id', departmentId)
      .eq('is_active', true)
      .order('title')
    setPositions(data || [])
  }

  async function generateEmployeeNumber() {
    const { data } = await supabase
      .from('employees')
      .select('employee_number')
      .order('created_at', { ascending: false })
      .limit(1)

    if (!data || data.length === 0) {
      setEmployeeNumber('EMP001')
      return
    }

    const last = data[0].employee_number
    const num = parseInt(last.replace('EMP', '')) + 1
    setEmployeeNumber(`EMP${num.toString().padStart(3, '0')}`)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const payload = {
      employee_number: formData.get('employee_number') as string,
      full_name: formData.get('full_name') as string,
      email: formData.get('email') as string,
      phone: (formData.get('phone') as string) || undefined,
      address: (formData.get('address') as string) || undefined,
      department_id: formData.get('department_id') as string,
      position_id: formData.get('position_id') as string,
      hire_date: formData.get('hire_date') as string,
      employment_status: (formData.get('employment_status') as string) || 'probation',
      salary: formData.get('salary') ? parseFloat(formData.get('salary') as string) : undefined,
      emergency_contact_name: (formData.get('emergency_contact_name') as string) || undefined,
      emergency_contact_phone: (formData.get('emergency_contact_phone') as string) || undefined,
    }

    // Validate position selected
    if (!payload.position_id) {
      toast.error('Please select a position')
      setLoading(false)
      return
    }

    const res = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const result = await res.json()

    if (!res.ok) {
      toast.error(result.error || 'Failed to create employee')
      setLoading(false)
      return
    }

    toast.success('Employee created successfully!')
    router.push('/employees')
    router.refresh()
  }

  if (loadingDeps) {
    return (
      <div className="p-6 lg:p-8">
        <LoadingState message="Loading form..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <ErrorState
          title="Failed to load data"
          message={error}
          onRetry={() => { setError(null); setLoadingDeps(true); fetchDepartments(); }}
        />
      </div>
    )
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
        <h1 className="text-2xl font-bold text-slate-900">Add New Employee</h1>
        <p className="text-slate-500">Create a new employee record</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Personal details and employee ID</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="employee_number">Employee Number</Label>
              <Input
                id="employee_number"
                name="employee_number"
                value={employeeNumber}
                onChange={(e) => setEmployeeNumber(e.target.value)}
                required
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                name="full_name"
                placeholder="John Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="john.doe@company.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                placeholder="+62 812 3456 7890"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                placeholder="Jl. Sudirman No. 123, Jakarta"
              />
            </div>
          </CardContent>
        </Card>

        {/* Employment Info */}
        <Card>
          <CardHeader>
            <CardTitle>Employment Information</CardTitle>
            <CardDescription>Company details and role</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="department_id">Department</Label>
              <Select name="department_id" required onValueChange={(v) => { if (v && typeof v === 'string') fetchPositions(v); else fetchPositions(null); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="position_id">Position</Label>
              <Select name="position_id" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((pos) => (
                    <SelectItem key={pos.id} value={pos.id}>
                      {pos.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hire_date">Hire Date</Label>
              <Input
                id="hire_date"
                name="hire_date"
                type="date"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employment_status">Status</Label>
              <Select name="employment_status" defaultValue="probation">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="probation">Probation</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary">Basic Salary (IDR)</Label>
              <Input
                id="salary"
                name="salary"
                type="number"
                placeholder="15000000"
                min="0"
              />
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Emergency Contact</CardTitle>
            <CardDescription>In case of emergency</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="emergency_contact_name">Contact Name</Label>
              <Input
                id="emergency_contact_name"
                name="emergency_contact_name"
                placeholder="Jane Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergency_contact_phone">Contact Phone</Label>
              <Input
                id="emergency_contact_phone"
                name="emergency_contact_phone"
                placeholder="+62 812 3456 7890"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Link href="/employees">
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Employee
          </Button>
        </div>
      </form>
    </div>
  )
}
