import * as React from "react"
import { cn } from "@/lib/utils"

const Badge = React.forwardRef(({ className, variant = "default", ...props }, ref) => {
  const variants = {
    default: "border-primary/20 bg-primary/10 text-primary hover:bg-primary/15",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/80",
    outline: "text-foreground border border-input bg-card",
  }
  return (
    <div
      ref={ref}
      className={cn("inline-flex min-h-6 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-tight transition-colors", variants[variant], className)}
      {...props}
    />
  )
})
Badge.displayName = "Badge"

export { Badge }
