import { Sidebar } from '@/components/layout/sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <main className="lg:pl-64">
        {/* Mobile top padding to avoid sidebar trigger overlap */}
        <div className="min-h-screen pt-16 lg:pt-0">{children}</div>
      </main>
    </div>
  )
}
