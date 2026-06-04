import * as React from "react"
import { cn } from "@/lib/utils"

const Alert = React.forwardRef(({ className, variant = "default", ...props }, ref) => {
  const variants = {
    default: "border-border bg-card text-foreground",
    destructive: "border-destructive/35 bg-destructive/10 text-destructive [&>svg]:text-destructive",
  }
  return (
    <div
      ref={ref}
      role="alert"
      className={cn("relative w-full rounded-lg border p-4 shadow-sm [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4", variants[variant], className)}
      {...props}
    />
  )
})
Alert.displayName = "Alert"

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("text-sm [&_p]:leading-relaxed", className)} {...props} />
))
AlertDescription.displayName = "AlertDescription"

const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h5 ref={ref} className={cn("mb-1 font-semibold leading-tight tracking-normal", className)} {...props} />
))
AlertTitle.displayName = "AlertTitle"

export { Alert, AlertDescription, AlertTitle }
