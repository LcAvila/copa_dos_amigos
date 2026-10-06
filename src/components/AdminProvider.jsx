import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { AdminContexto } from '../lib/adminContexto'

export function AdminProvider({ children }) {
  const [carregando, setCarregando] = useState(true)
  const [ehAdmin, setEhAdmin] = useState(false)
  const [usuario, setUsuario] = useState(null)

  const aplicar = useCallback(async (sessaoUsuario) => {
    if (!sessaoUsuario) {
      setUsuario(null)
      setEhAdmin(false)
      setCarregando(false)
      return
    }

    const { data } = await supabase
      .from('administradores')
      .select('usuario_id')
      .eq('usuario_id', sessaoUsuario.id)
      .maybeSingle()

    setUsuario(sessaoUsuario)
    setEhAdmin(Boolean(data))
    setCarregando(false)
  }, [])

  useEffect(() => {
    let ativo = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (ativo) aplicar(session?.user ?? null)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evento, session) => {
      aplicar(session?.user ?? null)
    })

    return () => {
      ativo = false
      subscription.unsubscribe()
    }
  }, [aplicar])

  const entrar = useCallback(async (email, senha) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })

    if (error) {
      return { erro: 'E-mail ou senha incorretos.' }
    }

    const { data: admin } = await supabase
      .from('administradores')
      .select('usuario_id')
      .eq('usuario_id', data.user.id)
      .maybeSingle()

    if (!admin) {
      await supabase.auth.signOut()
      return { erro: 'Este usuário não tem permissão de administrador.' }
    }

    setUsuario(data.user)
    setEhAdmin(true)
    setCarregando(false)
    return {}
  }, [])

  const sair = useCallback(async () => {
    await supabase.auth.signOut()
    setUsuario(null)
    setEhAdmin(false)
  }, [])

  const valor = useMemo(
    () => ({ carregando, ehAdmin, usuario, entrar, sair }),
    [carregando, ehAdmin, usuario, entrar, sair]
  )

  return <AdminContexto.Provider value={valor}>{children}</AdminContexto.Provider>
}
