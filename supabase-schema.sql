-- ============================================================
-- W SYSTEM HRIS - Database Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- DEPARTMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  parent_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  head_user_id UUID,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- POSITIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(100) NOT NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  level INTEGER DEFAULT 1 CHECK (level BETWEEN 1 AND 10),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EMPLOYEES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_number VARCHAR(20) UNIQUE NOT NULL,
  full_name VARCHAR(200) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  position_id UUID REFERENCES public.positions(id) ON DELETE SET NULL,
  hire_date DATE NOT NULL,
  employment_status VARCHAR(20) DEFAULT 'probation' 
    CHECK (employment_status IN ('probation', 'active', 'inactive', 'terminated')),
  salary DECIMAL(12, 2),
  emergency_contact_name VARCHAR(200),
  emergency_contact_phone VARCHAR(20),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ATTENDANCE LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.attendance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  check_in_photo_url TEXT,
  check_out_photo_url TEXT,
  location_in TEXT,
  location_out TEXT,
  status VARCHAR(20) DEFAULT 'present' 
    CHECK (status IN ('present', 'absent', 'late', ' excused')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

-- ============================================================
-- LEAVE TYPES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.leave_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  default_days_per_year INTEGER DEFAULT 0,
  is_paid BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LEAVE BALANCES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.leave_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type_id UUID REFERENCES public.leave_types(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  total_days DECIMAL(5, 1) NOT NULL DEFAULT 0,
  used_days DECIMAL(5, 1) NOT NULL DEFAULT 0,
  remaining_days DECIMAL(5, 1) GENERATED ALWAYS AS (total_days - used_days) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, leave_type_id, year)
);

-- ============================================================
-- LEAVE REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type_id UUID REFERENCES public.leave_types(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days DECIMAL(5, 1) NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending' 
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by UUID REFERENCES public.employees(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PAYROLL COMPONENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payroll_components (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('earning', 'deduction')),
  is_taxable BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PAYROLL ENTRIES (Monthly)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payroll_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  payroll_month INTEGER NOT NULL CHECK (payroll_month BETWEEN 1 AND 12),
  payroll_year INTEGER NOT NULL,
  basic_salary DECIMAL(12, 2) NOT NULL,
  total_earnings DECIMAL(12, 2) DEFAULT 0,
  total_deductions DECIMAL(12, 2) DEFAULT 0,
  net_salary DECIMAL(12, 2) DEFAULT 0,
  ptkp_status VARCHAR(20) DEFAULT 'tk0',
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  bpjs_tk DECIMAL(12, 2) DEFAULT 0,
  bpjs_kes DECIMAL(12, 2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft' 
    CHECK (status IN ('draft', 'calculated', 'approved', 'paid')),
  processed_by UUID REFERENCES public.employees(id),
  processed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, payroll_month, payroll_year)
);

-- ============================================================
-- PAYROLL DETAILS (Per component)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payroll_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payroll_id UUID REFERENCES public.payroll_entries(id) ON DELETE CASCADE,
  component_id UUID REFERENCES public.payroll_components(id) ON DELETE SET NULL,
  amount DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_employees_department ON public.employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON public.attendance_logs(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON public.leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_employee ON public.leave_balances(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_employee ON public.payroll_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_details_payroll ON public.payroll_details(payroll_id);

-- ============================================================
-- TRIGGER: updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.positions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.leave_balances
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.payroll_entries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_details ENABLE ROW LEVEL SECURITY;

-- Public read for reference tables (for authenticated users)
CREATE POLICY "Public read departments" ON public.departments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public read positions" ON public.positions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public read leave_types" ON public.leave_types FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public read payroll_components" ON public.payroll_components FOR SELECT USING (auth.role() = 'authenticated');

-- Employees: HR and Admin full access, employee sees own
CREATE POLICY "HR/Admin full access employees" ON public.employees FOR ALL USING (
  auth.role() = 'authenticated' AND (
    EXISTS (SELECT 1 FROM public.employees WHERE user_id = auth.uid() AND employment_status IN ('active') AND department_id IN (SELECT department_id FROM public.employees WHERE user_id = auth.uid()))
  )
);

-- Employees: anyone authenticated can read
CREATE POLICY "Authenticated read employees" ON public.employees FOR SELECT USING (auth.role() = 'authenticated');

-- Attendance: own records + HR/Admin
CREATE POLICY "Employees read own attendance" ON public.attendance_logs FOR SELECT 
  USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "Employees insert own attendance" ON public.attendance_logs FOR INSERT 
  WITH CHECK (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

-- Leave requests: own + HR/Admin
CREATE POLICY "Employees read own leave" ON public.leave_requests FOR SELECT 
  USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "Employees insert own leave" ON public.leave_requests FOR INSERT 
  WITH CHECK (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

-- Leave balances: own
CREATE POLICY "Employees read own leave balance" ON public.leave_balances FOR SELECT 
  USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

-- Payroll: own + HR/Admin  
CREATE POLICY "Employees read own payroll" ON public.payroll_entries FOR SELECT 
  USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

-- Payroll details: via payroll_entries
CREATE POLICY "Access payroll details via payroll" ON public.payroll_details FOR SELECT 
  USING (payroll_id IN (SELECT id FROM public.payroll_entries WHERE employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())));

-- ============================================================
-- DEFAULT DATA: Leave Types
-- ============================================================
INSERT INTO public.leave_types (name, code, default_days_per_year, is_paid) VALUES
  ('Annual Leave', 'annual', 12, true),
  ('Sick Leave', 'sick', 14, true),
  ('Emergency Leave', 'emergency', 3, true),
  ('Maternity Leave', 'maternity', 90, true),
  ('Paternity Leave', 'paternity', 3, true),
  ('Unpaid Leave', 'unpaid', 0, false)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- DEFAULT DATA: Payroll Components
-- ============================================================
INSERT INTO public.payroll_components (name, code, type, is_taxable, is_default) VALUES
  ('Gaji Pokok', 'basic_salary', 'earning', true, true),
  ('Tunjangan Transport', 'transport', 'earning', true, false),
  ('Tunjangan Makan', 'meal', 'earning', true, false),
  ('Tunjangan Komunikasi', 'communication', 'earning', true, false),
  ('Tunjangan Kesehatan', 'health', 'earning', true, false),
  ('Tunjangan Position', 'position_allowance', 'earning', true, false),
  ('Bonus', 'bonus', 'earning', true, false),
  (' THR', 'thr', 'earning', true, false),
  ('PPh 21', 'pph21', 'deduction', false, false),
  ('BPJS TK', 'bpjs_tk', 'deduction', false, false),
  ('BPJS Kesehatan', 'bpjs_kes', 'deduction', false, false),
  ('Iuran Pension', 'pension', 'deduction', false, false),
  ('Potongan Absensi', 'attendance_deduction', 'deduction', false, false)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- DEFAULT DATA: Departments
-- ============================================================
INSERT INTO public.departments (name, code, description) VALUES
  ('Human Resources', 'HR', 'Human Resources Department'),
  ('Finance', 'FIN', 'Finance Department'),
  ('Information Technology', 'IT', 'IT Department'),
  ('Operations', 'OPS', 'Operations Department'),
  ('General Affair', 'GA', 'General Affair Department')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- SERVICE ROLE BYPASS (for Next.js SSR)
-- Note: In Supabase, service_role bypasses RLS. 
-- We will use service_role only in server-side code.
-- ============================================================
