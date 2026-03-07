/**
 * useAiFill — Generic hook to let the AI assistant fill any React Hook Form.
 *
 * Usage in any form page:
 *   const form = useForm(...)
 *   useAiFill(form)
 *
 * That's it. The AI can now fill this form via the action bus.
 */

import { useEffect } from 'react'
import type { UseFormReturn } from 'react-hook-form'

export function useAiFill(form: UseFormReturn<any>) {
  useEffect(() => {
    const handler = (e: Event) => {
      const { fields } = (e as CustomEvent<{ fields: Record<string, unknown> }>).detail
      if (!fields) return

      for (const [key, value] of Object.entries(fields)) {
        // Skip internal fields (prefixed with _)
        if (key.startsWith('_')) continue
        form.setValue(key, value, { shouldValidate: true, shouldDirty: true })
      }
    }

    window.addEventListener('ai:fill', handler)
    return () => window.removeEventListener('ai:fill', handler)
  }, [form])
}
