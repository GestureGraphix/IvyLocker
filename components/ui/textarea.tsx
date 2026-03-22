import * as React from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'border-border placeholder:text-muted-foreground focus-visible:border-ivy-mid focus-visible:ring-2 focus-visible:ring-ivy-mid/20 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 flex field-sizing-content min-h-16 w-full rounded-[3px] border bg-white px-3 py-2 text-sm text-foreground shadow-none transition-[border-color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
