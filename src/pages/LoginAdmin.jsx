import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdmin } from '../hooks/useAdmin'
import BotaoVoltar from '../components/BotaoVoltar'

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
    <div className="entrar py-6">
      <BotaoVoltar />

      <h1 className="titulo-brilho mt-4 text-center text-4xl font-black uppercase leading-tight tracking-tight">
        Bem vindo de volta jogador
      </h1>

      <form onSubmit={enviar} className="card mt-6 space-y-4">
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
