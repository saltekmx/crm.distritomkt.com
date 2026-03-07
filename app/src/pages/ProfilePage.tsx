import { useState } from 'react'
import { User, Mail, Briefcase, Globe, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/stores/authStore'
import { usersApi } from '@/services/api'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { getInitials } from '@/lib/utils'

const TIMEZONES = [
  { value: 'America/Mexico_City', label: 'Ciudad de México (CST/CDT)' },
  { value: 'America/Cancun', label: 'Cancún (EST)' },
  { value: 'America/Monterrey', label: 'Monterrey (CST/CDT)' },
  { value: 'America/Hermosillo', label: 'Hermosillo (MST)' },
  { value: 'America/Tijuana', label: 'Tijuana (PST/PDT)' },
  { value: 'America/Mazatlan', label: 'Mazatlán (MST/MDT)' },
  { value: 'America/Chihuahua', label: 'Chihuahua (CST/CDT)' },
  { value: 'America/Bogota', label: 'Bogotá (COT)' },
  { value: 'America/Lima', label: 'Lima (PET)' },
  { value: 'America/Santiago', label: 'Santiago (CLT/CLST)' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (ART)' },
  { value: 'America/New_York', label: 'Nueva York (EST/EDT)' },
  { value: 'America/Los_Angeles', label: 'Los Ángeles (PST/PDT)' },
  { value: 'Europe/Madrid', label: 'Madrid (CET/CEST)' },
  { value: 'UTC', label: 'UTC' },
]

export default function ProfilePage() {
  const { user } = useAuth()
  const fetchUser = useAuthStore((s) => s.fetchUser)
  const [saving, setSaving] = useState(false)

  if (!user) return null

  const handleTimezoneChange = async (tz: string) => {
    setSaving(true)
    try {
      await usersApi.update(user.id, { zona_horaria: tz } as Record<string, unknown>)
      await fetchUser()
      toast.success('Zona horaria actualizada')
    } catch {
      // toast handled by interceptor
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-in">
      <PageHeader
        breadcrumbs={[{ label: 'Mi Perfil' }]}
        title="Mi Perfil"
        icon={<User className="h-5 w-5" />}
      />

      <div className="card-modern p-6">
        <div className="flex items-center gap-4">
          <Avatar size="xl">
            <AvatarImage src={user.avatar ?? undefined} alt={user.name} />
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-xl font-bold">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <div className="mt-6 space-y-4 border-t border-border/50 pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Puesto</p>
                <p className="text-sm font-medium">{user.position || 'Sin asignar'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="card-modern p-6">
        <h2 className="text-lg font-semibold mb-4">Preferencias</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1">Zona horaria</p>
              <Select
                value={user.timezone}
                onValueChange={handleTimezoneChange}
                disabled={saving}
              >
                <SelectTrigger className="w-full max-w-sm">
                  <SelectValue placeholder="Seleccionar zona horaria..." />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      <span className="flex items-center gap-2">
                        {tz.value === user.timezone && <Check className="h-3 w-3 text-primary" />}
                        {tz.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
