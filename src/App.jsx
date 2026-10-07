import { Routes, Route, useLocation } from 'react-router-dom'
import { AdminProvider } from './components/AdminProvider'
import RotaAdmin from './components/RotaAdmin'
import Home from './pages/Home.jsx'
import SelecionarPerfil from './pages/SelecionarPerfil.jsx'
import Torneio from './pages/Torneio.jsx'
import Sorteio from './pages/Sorteio.jsx'
import Tabela from './pages/Tabela.jsx'
import Classificacao from './pages/Classificacao.jsx'
import Perfil from './pages/Perfil.jsx'
import LoginAdmin from './pages/LoginAdmin.jsx'
import Admin from './pages/Admin.jsx'
import AdminTorneio from './pages/AdminTorneio.jsx'
import AdminPerfis from './pages/AdminPerfis.jsx'

export default function App() {
  const { pathname } = useLocation()

  return (
    <AdminProvider>
      <div className="min-h-dvh max-w-md md:max-w-3xl mx-auto px-4 pb-24">
        <div key={pathname} className="piso">
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
        </div>
      </div>
    </AdminProvider>
  )
}
