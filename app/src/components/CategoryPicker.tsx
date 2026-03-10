import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { PROJECT_CATEGORIES, getCategory, getSubcategory } from '@/lib/projects'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface CategoryPickerProps {
  tipo: string
  subcategoria: string
  onSelect: (tipo: string, subcategoria: string) => void
  error?: string
}

export function CategoryPicker({ tipo, subcategoria, onSelect, error }: CategoryPickerProps) {
  const [open, setOpen] = useState(false)

  // Build display label
  let displayLabel = ''
  if (tipo) {
    const cat = getCategory(tipo)
    if (cat) {
      displayLabel = cat.label
      if (subcategoria) {
        const sub = getSubcategory(tipo, subcategoria)
        if (sub) displayLabel += ` → ${sub.label}`
      }
    }
  }

  const handleSelect = (catValue: string, subValue?: string) => {
    onSelect(catValue, subValue ?? '')
    setOpen(false)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-colors',
            'focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-1',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error
              ? 'border-destructive'
              : 'border-input hover:border-ring/40',
            !displayLabel && 'text-muted-foreground',
          )}
        >
          <span className="truncate">{displayLabel || 'Seleccionar categoría...'}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {PROJECT_CATEGORIES.map((cat) =>
          cat.subcategories.length > 0 ? (
            <DropdownMenuSub key={cat.value}>
              <DropdownMenuSubTrigger>{cat.label}</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56">
                {cat.subcategories.map((sub) => (
                  <DropdownMenuItem
                    key={sub.value}
                    onSelect={() => handleSelect(cat.value, sub.value)}
                    className={cn(
                      tipo === cat.value && subcategoria === sub.value && 'bg-primary/10 text-primary font-medium',
                    )}
                  >
                    {sub.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ) : (
            <DropdownMenuItem
              key={cat.value}
              onSelect={() => handleSelect(cat.value)}
              className={cn(
                tipo === cat.value && !subcategoria && 'bg-primary/10 text-primary font-medium',
              )}
            >
              {cat.label}
            </DropdownMenuItem>
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
