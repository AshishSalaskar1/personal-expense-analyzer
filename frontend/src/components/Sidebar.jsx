import { NavLink } from 'react-router-dom'
import { Upload, LayoutDashboard, Table2, Tags } from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { to: '/', label: 'Upload', icon: Upload },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: Table2 },
  { to: '/tags', label: 'Tag Manager', icon: Tags },
]

export default function Sidebar() {
  return (
    <aside className="w-56 min-h-screen border-r bg-card flex flex-col py-6 px-3 gap-1 shrink-0">
      <div className="px-3 mb-6">
        <h1 className="text-lg font-bold text-primary">Expense Buddy</h1>
        <p className="text-xs text-muted-foreground">Personal Finance Tracker</p>
      </div>
      {links.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )
          }
        >
          <Icon size={16} />
          {label}
        </NavLink>
      ))}
    </aside>
  )
}
