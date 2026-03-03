import { useAuth } from '@/hooks/useAuth'

export default function ProfilePage() {
  const { user } = useAuth()

  if (!user) return null

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Mi Perfil</h1>

      <div className="card-modern p-6">
        <div className="flex items-center gap-4">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="h-16 w-16 rounded-full ring-2 ring-primary/20"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
              {initials}
            </div>
          )}
          <div>
            <p className="text-xl font-bold">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            {user.position && (
              <p className="text-sm text-muted-foreground">{user.position}</p>
            )}
          </div>
        </div>

        <div className="mt-6 space-y-4 border-t border-border/50 pt-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Posición</p>
              <p className="font-medium">{user.position || 'Sin asignar'}</p>
            </div>
          </div>

          {user.permissions.length > 0 && (
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Permisos</p>
              <div className="flex flex-wrap gap-2">
                {user.permissions.map((perm) => (
                  <span key={perm} className="status-badge status-badge-info">
                    {perm}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
