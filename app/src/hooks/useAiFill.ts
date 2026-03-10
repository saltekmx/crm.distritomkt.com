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

// Fields that must be coerced to number before setting
const NUMERIC_FIELDS = new Set(['cliente_id', 'responsable_id'])

export function useAiFill(form: UseFormReturn<any>) {
  useEffect(() => {
    const handler = (e: Event) => {
      const { fields } = (e as CustomEvent<{ fields: Record<string, unknown> }>).detail
      if (!fields) return

      console.log('[AI Fill] Received fields:', fields)
      for (const [key, raw] of Object.entries(fields)) {
        // Skip internal fields (prefixed with _)
        if (key.startsWith('_')) continue
        const value = NUMERIC_FIELDS.has(key) && typeof raw === 'string' ? Number(raw) : raw
        console.log(`[AI Fill] Setting ${key}:`, value)
        form.setValue(key, value, { shouldValidate: true, shouldDirty: true })
      }
    }

    window.addEventListener('ai:fill', handler)
    return () => window.removeEventListener('ai:fill', handler)
  }, [form])
}
