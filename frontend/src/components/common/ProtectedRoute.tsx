import { Navigate, NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import { LangToggle } from '@/components/common/LangToggle'

export function ProtectedRoute() {
  const { isAuthenticated, logout } = useAuth()
  const { t } = useTranslation()

  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-56 bg-slate-900 flex flex-col shrink-0 print:hidden px-3">
        <div className="flex justify-center">
          <img src="/img/faviconT.png" alt="MiroResult" className="h-32" />
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              isActive ? 'sidebar-item-active' : 'sidebar-item'
            }
          >
            {t('nav.dashboard')}
          </NavLink>
          <NavLink
            to="/simulations"
            className={({ isActive }) =>
              isActive ? 'sidebar-item-active' : 'sidebar-item'
            }
          >
            {t('nav.simulations')}
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              isActive ? 'sidebar-item-active' : 'sidebar-item'
            }
          >
            {t('nav.settings')}
          </NavLink>
        </nav>

        <div className="px-3 py-4 border-t border-slate-800 space-y-2">
          <LangToggle />
          <button
            onClick={logout}
            className="sidebar-item w-full text-left"
          >
            {t('nav.logout')}
          </button>
        </div>
      </aside>

      {/* Contenu principal */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-screen-2xl mx-auto px-4 py-4">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
