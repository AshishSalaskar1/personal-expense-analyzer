import { cn } from '@/lib/utils'

export default function PageShell({ eyebrow, title, description, actions, children, className }) {
  return (
    <section className={cn('page-shell space-y-6', className)}>
      <div className="flex flex-col gap-4 border-b border-border/80 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-1">
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {eyebrow}
            </p>
          )}
          <h2 className="text-2xl font-semibold leading-tight tracking-normal text-foreground sm:text-3xl">
            {title}
          </h2>
          {description && (
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  )
}