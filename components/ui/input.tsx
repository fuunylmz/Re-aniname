import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <div className="relative w-full group">
      <input
        type={type}
        data-slot="input"
        className={cn(
          "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground h-12 w-full min-w-0 rounded-t-md border-b-2 border-input bg-muted/30 px-4 pt-4 pb-1 text-base transition-all outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus:border-primary focus:bg-muted/50",
          "aria-invalid:border-destructive",
          className
        )}
        {...props}
      />
    </div>
  )
}

export { Input }
