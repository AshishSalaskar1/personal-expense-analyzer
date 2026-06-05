import { NavLink } from 'react-router-dom'
import { Upload, LayoutDashboard, Tags, WalletCards } from 'lucide-react'
import ThemeToggle from '@/components/ThemeToggle'
import { cn } from '@/lib/utils'

const links = [
  { to: '/', label: 'Upload', icon: Upload },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tags', label: 'Tag Manager', icon: Tags },
]

export default function Sidebar() {
  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col border-r border-border/80 bg-card/95 shadow-sm lg:flex">
        <div className="px-5 pb-4 pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
              <WalletCards size={17} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-[1.15rem] font-extrabold lowercase leading-tight tracking-tight text-foreground">
                expense buddy
              </h1>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors duration-200 cursor-pointer',
                  isActive
                    ? 'bg-foreground text-background font-bold'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground font-semibold'
                )
              }
            >
              <Icon size={18} />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mx-5 mb-5 space-y-4 rounded-xl border border-border/60 bg-muted/40 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Status</p>
            <p className="mt-2 text-sm font-semibold text-foreground">Local-first ledger</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Upload, tag, analyze, export.</p>
          </div>
          <ThemeToggle className="w-full" />
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-card/95 px-2 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-semibold transition-colors cursor-pointer',
                isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )
            }
          >
            <Icon size={18} />
            <span className="max-w-full truncate">{label}</span>
          </NavLink>
        ))}
        <ThemeToggle className="min-h-14 flex-col gap-1 border-0 bg-transparent px-1 py-0 text-[11px] text-muted-foreground shadow-none hover:bg-muted hover:text-foreground" showLabel={false} />
      </nav>
    </>
  )
}
