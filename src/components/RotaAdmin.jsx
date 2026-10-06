import { Navigate } from 'react-router-dom'
import { useAdmin } from '../hooks/useAdmin'
import Loading from './Loading'

export default function RotaAdmin({ children }) {
  const { carregando, ehAdmin } = useAdmin()

  if (carregando) return <Loading texto="Verificando permissões..." />
  if (!ehAdmin) return <Navigate to="/admin/login" replace />

  return children
}
