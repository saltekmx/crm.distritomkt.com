import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Moon, Sun, Settings, LogOut, User, ChevronDown } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { getInitials } from '@/lib/utils'
import { ROUTES } from '@/lib/routes'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

export function Header() {
  const { user, logout } = useAuth()
  const { resolvedTheme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu] = useState(false)

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex h-full items-center justify-between px-4 md:px-6">
        {/* Left side - Greeting */}
        <div className="flex items-center gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{getGreeting()},</p>
            <p className="text-lg font-semibold text-foreground">{user?.name?.split(' ')[0] ?? 'Usuario'}</p>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-1">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-10 h-10 rounded-xl cursor-pointer
                       text-muted-foreground hover:text-foreground hover:bg-muted
                       transition-all duration-200"
            title={resolvedTheme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          >
            {resolvedTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          {/* Divider */}
          <div className="w-px h-8 bg-border mx-2" />

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 h-10 pl-2 pr-3 rounded-xl cursor-pointer hover:bg-muted transition-all duration-200"
            >
              <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-foreground leading-tight">{user?.name ?? 'Usuario'}</p>
                <p className="text-[10px] text-muted-foreground">
                  {user?.position || 'Usuario'}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
            </button>

            {/* User Dropdown */}
            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 z-50 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in">
                  <div className="px-4 py-3 border-b border-border bg-muted/30">
                    <p className="text-sm font-medium text-foreground">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <div className="p-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false)
                        navigate('/')
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
                    >
                      <User className="h-4 w-4 text-muted-foreground" />
                      Mi Perfil
                    </button>
                    <button
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 w-full px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
                    >
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      Configuración
                    </button>
                    <div className="my-1 h-px bg-border" />
                    <button
                      onClick={() => {
                        setShowUserMenu(false)
                        logout()
                        navigate(ROUTES.LOGIN)
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
