import { useContext } from 'react'
import { AdminContexto } from '../lib/adminContexto'

export function useAdmin() {
  const contexto = useContext(AdminContexto)
  if (!contexto) throw new Error('useAdmin precisa estar dentro de AdminProvider')
  return contexto
}
