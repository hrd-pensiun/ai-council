import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      employee_number,
      full_name,
      email,
      phone,
      address,
      department_id,
      position_id,
      hire_date,
      employment_status,
      salary,
      emergency_contact_name,
      emergency_contact_phone,
    } = body

    if (!employee_number || !full_name || !email || !department_id || !position_id || !hire_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Use service role for admin operations
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Create auth user first
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: 'Welcome123!',
      email_confirm: true,
      user_metadata: {
        full_name,
        employee_id: employee_number,
      },
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Create employee record
    const { error: empError } = await supabaseAdmin
      .from('employees')
      .insert({
        employee_number,
        full_name,
        email,
        phone: phone || null,
        address: address || null,
        department_id,
        position_id,
        hire_date,
        employment_status: employment_status || 'probation',
        salary: salary ? parseFloat(salary) : null,
        user_id: authUser.user?.id,
        is_active: true,
        emergency_contact_name: emergency_contact_name || null,
        emergency_contact_phone: emergency_contact_phone || null,
      })

    if (empError) {
      // Rollback: delete auth user if employee insert fails
      if (authUser.user) {
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      }
      return NextResponse.json({ error: empError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, employee_number })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
