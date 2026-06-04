import * as React from "react"
import { cn } from "@/lib/utils"

const Button = React.forwardRef(({ className, variant = "default", size = "default", ...props }, ref) => {
  const variants = {
    default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
    destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
    outline: "border border-input bg-card text-foreground shadow-sm hover:border-primary/45 hover:bg-primary/5 hover:text-primary",
    secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/90",
    ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
    link: "text-primary underline-offset-4 hover:underline",
  }
  const sizes = {
    default: "min-h-11 px-4 py-2.5",
    sm: "min-h-10 rounded-md px-3 py-2 text-xs",
    lg: "min-h-12 rounded-md px-6 py-3",
    icon: "h-11 w-11 p-0",
  }
  return (
    <button
      className={cn(
        "inline-flex max-w-full items-center justify-center gap-2 whitespace-normal break-words rounded-lg text-center text-sm font-semibold leading-tight transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
        variants[variant],
        sizes[size],
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button }
