import { lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AdminProvider } from './components/AdminProvider'
import RotaAdmin from './components/RotaAdmin'
import Loading from './components/Loading'

const Home = lazy(() => import('./pages/Home.jsx'))
const SelecionarPerfil = lazy(() => import('./pages/SelecionarPerfil.jsx'))
const Torneio = lazy(() => import('./pages/Torneio.jsx'))
const Sorteio = lazy(() => import('./pages/Sorteio.jsx'))
const Tabela = lazy(() => import('./pages/Tabela.jsx'))
const Classificacao = lazy(() => import('./pages/Classificacao.jsx'))
const Perfil = lazy(() => import('./pages/Perfil.jsx'))
const LoginAdmin = lazy(() => import('./pages/LoginAdmin.jsx'))
const Admin = lazy(() => import('./pages/Admin.jsx'))
const AdminTorneio = lazy(() => import('./pages/AdminTorneio.jsx'))
const AdminPerfis = lazy(() => import('./pages/AdminPerfis.jsx'))

export default function App() {
  const { pathname } = useLocation()

  return (
    <AdminProvider>
      <div className="min-h-dvh max-w-md md:max-w-3xl mx-auto px-4 pb-24">
        <div key={pathname} className="piso">
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/admin/login" element={<LoginAdmin />} />
              <Route path="/admin" element={<RotaAdmin><Admin /></RotaAdmin>} />
              <Route path="/admin/torneio/novo" element={<RotaAdmin><AdminTorneio /></RotaAdmin>} />
              <Route path="/admin/torneio/:id" element={<RotaAdmin><AdminTorneio /></RotaAdmin>} />
              <Route path="/admin/perfis" element={<RotaAdmin><AdminPerfis /></RotaAdmin>} />
              <Route path="/perfis" element={<SelecionarPerfil />} />
              <Route path="/torneio/:id" element={<Torneio />} />
              <Route path="/torneio/:id/sorteio" element={<Sorteio />} />
              <Route path="/torneio/:id/tabela" element={<Tabela />} />
              <Route path="/torneio/:id/classificacao" element={<Classificacao />} />
              <Route path="/perfil/:id" element={<Perfil />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </AdminProvider>
  )
}
