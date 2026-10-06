import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdmin } from '../hooks/useAdmin'

export default function LoginAdmin() {
  const navigate = useNavigate()
  const { entrar, ehAdmin, carregando } = useAdmin()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!carregando && ehAdmin) navigate('/admin', { replace: true })
  }, [carregando, ehAdmin, navigate])

  async function enviar(e) {
    e.preventDefault()
    setErro('')
    setEnviando(true)

    const resultado = await entrar(email.trim(), senha)

    setEnviando(false)
    if (resultado.erro) {
      setErro(resultado.erro)
      return
    }
    navigate('/admin', { replace: true })
  }

  return (
    <div className="py-10">
      <p className="etiqueta">• Acesso restrito</p>
      <h1 className="mt-2 font-display text-3xl font-bold">
        Área do <span className="text-arena-primary">administrador</span>
      </h1>
      <p className="mt-1 text-sm text-arena-muted">
        Entre com a sua conta para gerenciar os campeonatos.
      </p>

      <form onSubmit={enviar} className="card mt-8 space-y-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-widest text-arena-muted">
            E-mail
          </label>
          <input
            className="input mt-2"
            type="email"
            autoComplete="username"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-widest text-arena-muted">
            Senha
          </label>
          <input
            className="input mt-2"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
        </div>

        {erro && <p className="text-sm text-arena-danger">{erro}</p>}

        <button type="submit" disabled={enviando} className="btn-primary w-full disabled:opacity-60">
          {enviando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
