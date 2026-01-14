'use client'

import { useState } from 'react'
import { Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormAnalysisDialog } from './form-analysis-dialog'

interface FormAnalysisButtonProps {
  onSuccess?: () => void
}

export function FormAnalysisButton({ onSuccess }: FormAnalysisButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="border-primary/50 hover:bg-primary/10"
      >
        <Activity className="mr-2 h-4 w-4" />
        Form Analysis
      </Button>

      <FormAnalysisDialog
        open={open}
        onOpenChange={setOpen}
        onSuccess={onSuccess}
      />
    </>
  )
}
