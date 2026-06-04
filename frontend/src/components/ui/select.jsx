import * as React from "react"
import { cn } from "@/lib/utils"

const SelectContext = React.createContext({})

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => {
  const [open, setOpen] = React.useState(false)
  return (
    <button
      ref={ref}
      className={cn(
        "flex min-h-11 w-full items-center justify-between rounded-lg border border-input bg-card px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      onClick={() => setOpen(!open)}
      {...props}
    >
      {children}
      <span className="ml-2 opacity-50">▾</span>
    </button>
  )
})
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = ({ placeholder }) => {
  const { value } = React.useContext(SelectContext)
  return <span>{value || placeholder}</span>
}

// Simple native select wrapper for full functionality
const NativeSelect = React.forwardRef(({ className, children, value, onChange, ...props }, ref) => (
  <select
    ref={ref}
    value={value}
    onChange={onChange}
    className={cn(
      "flex min-h-11 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 transition-colors cursor-pointer",
      className
    )}
    {...props}
  >
    {children}
  </select>
))
NativeSelect.displayName = "NativeSelect"

export { NativeSelect as Select, SelectTrigger, SelectValue }
