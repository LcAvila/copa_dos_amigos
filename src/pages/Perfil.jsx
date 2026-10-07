import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import BotaoVoltar from '../components/BotaoVoltar'
import { supabase } from '../lib/supabaseClient'
import { useSessaoJogador } from '../hooks/useSessaoJogador'
import { arquivoParaBase64, limitarArquivo } from '../lib/imagem'
import Loading from '../components/Loading'

function Capa({ url }) {
  if (url) {
    return <img src={url} alt="" className="size-full object-cover" />
  }
  return (
    <div className="size-full bg-gradient-to-br from-arena-secondary/25 via-arena-surface2 to-arena-primary/15" />
  )
}

function Avatar({ perfil, time, grande = false }) {
  const tamanho = grande ? 'size-24' : 'size-14'
  const escudo = grande ? 'size-12' : 'size-7'

  return (
    <div className="flex items-end gap-2">
      {perfil.avatar_url ? (
        <img
          src={perfil.avatar_url}
          alt={perfil.nome}
          className={`${tamanho} rounded-full object-cover border-4 border-arena-bg bg-arena-surface2`}
        />
      ) : (
        <div
          className={`${tamanho} rounded-full border-4 border-arena-bg bg-arena-surface2 flex items-center justify-center font-display font-bold text-arena-primary ${grande ? 'text-4xl' : 'text-xl'}`}
        >
          {perfil.nome?.trim()?.[0]?.toUpperCase() ?? '?'}
        </div>
      )}
      {time?.escudo_url && (
        <img
          src={time.escudo_url}
          alt={time.nome}
          title={time.nome}
          className={`${escudo} object-contain drop-shadow`}
        />
      )}
    </div>
  )
}

function CampoImagem({ rotulo, atual, preview, onArquivo, onRemover }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-arena-muted">{rotulo}</p>
      <div className="mt-2 flex items-center gap-3">
        <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-arena-surface2 border border-white/10 flex items-center justify-center">
          {preview ? (
            <img src={preview} alt="" className="size-full object-cover" />
          ) : atual ? (
            <img src={atual} alt="" className="size-full object-cover" />
          ) : (
            <span className="text-xs text-arena-muted">Sem foto</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label className="btn-ghost !px-3 !py-2 text-xs cursor-pointer">
            Escolher
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const arquivo = e.target.files?.[0]
                if (arquivo) onArquivo(arquivo)
                e.target.value = ''
              }}
            />
          </label>
          {(preview || atual) && (
            <button
              type="button"
              onClick={onRemover}
              className="text-xs text-arena-danger active:opacity-70"
            >
              Remover
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Perfil() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { sessao, entrar, sair } = useSessaoJogador()

  const [perfil, setPerfil] = useState(null)
  const [time, setTime] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState('')
  const [aviso, setAviso] = useState('')
  const [times, setTimes] = useState([])
  const [buscaTime, setBuscaTime] = useState('')

  const [form, setForm] = useState(null)

  const podeEditar = Boolean(sessao && sessao.id === id && sessao.pin)

  const buscarPerfil = useCallback(async () => {
    const { data, error } = await supabase.from('perfis').select('*').eq('id', id).single()

    if (error || !data) return null

    let timeData = null
    if (data.time_coracao_id) {
      const { data: t } = await supabase
        .from('times')
        .select('*')
        .eq('id', data.time_coracao_id)
        .single()
      timeData = t ?? null
    }

    return { perfil: data, time: timeData }
  }, [id])

  useEffect(() => {
    let ativo = true

    buscarPerfil().then((resultado) => {
      if (!ativo) return
      if (!resultado) {
        setErro('Perfil não encontrado.')
      } else {
        setPerfil(resultado.perfil)
        setTime(resultado.time)
      }
      setCarregando(false)
    })

    return () => {
      ativo = false
    }
  }, [buscarPerfil])

  function abrirEdicao() {
    setForm({
      biografia: perfil.biografia ?? '',
      timeId: perfil.time_coracao_id ?? '',
      pinNovo: '',
      avatarB64: null,
      avatarTipo: null,
      avatarPreview: null,
      removerAvatar: false,
      capaB64: null,
      capaTipo: null,
      capaPreview: null,
      removerCapa: false,
    })
    setErroForm('')
    setEditando(true)

    supabase
      .from('times')
      .select('id, nome, sigla, escudo_url, liga_nome')
      .eq('ativo', true)
      .order('nome')
      .then(({ data }) => setTimes(data ?? []))
  }

  async function escolherImagem(campo, arquivo) {
    const problema = limitarArquivo(arquivo)
    if (problema) {
      setErroForm(problema)
      return
    }
    try {
      const base64 = await arquivoParaBase64(arquivo)
      setForm((f) => ({
        ...f,
        [`${campo}B64`]: base64,
        [`${campo}Tipo`]: arquivo.type,
        [`${campo}Preview`]: URL.createObjectURL(arquivo),
        [`remover${campo === 'avatar' ? 'Avatar' : 'Capa'}`]: false,
      }))
      setErroForm('')
    } catch (e) {
      setErroForm(e.message)
    }
  }

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    setErroForm('')

    const corpo = {
      perfil_id: id,
      pin: sessao.pin,
      biografia: form.biografia,
      time_coracao_id: form.timeId || null,
      remover_time_coracao: !form.timeId,
      pin_novo: form.pinNovo || null,
    }

    if (form.avatarB64) {
      corpo.avatar = { base64: form.avatarB64, tipo: form.avatarTipo }
    }
    if (form.removerAvatar) corpo.remover_avatar = true

    if (form.capaB64) {
      corpo.capa = { base64: form.capaB64, tipo: form.capaTipo }
    }
    if (form.removerCapa) corpo.remover_capa = true

    const { data, error } = await supabase.functions.invoke('editar-perfil', { body: corpo })
    setSalvando(false)

    if (error) {
      setErroForm(
        'Não foi possível salvar. Verifique sua conexão ou se a função editar-perfil está implantada no Supabase.'
      )
      return
    }
    if (data?.erro) {
      setErroForm(data.erro)
      return
    }

    const perfilAtualizado = data.perfil
    setPerfil(perfilAtualizado)

    if (form.timeId) {
      const { data: timeData } = await supabase
        .from('times')
        .select('*')
        .eq('id', form.timeId)
        .single()
      setTime(timeData ?? null)
    } else {
      setTime(null)
    }

    if (form.pinNovo) {
      entrar(perfilAtualizado, form.pinNovo)
    }

    setEditando(false)
    setForm(null)
    setAviso('Perfil atualizado com sucesso!')
    setTimeout(() => setAviso(''), 4000)
  }

  if (carregando) return <Loading texto="Carregando perfil..." />

  if (erro) {
    return (
      <div className="py-10 text-center">
        <p className="text-arena-danger">{erro}</p>
        <button type="button" onClick={() => navigate('/')} className="btn-ghost mt-4">
          Voltar ao início
        </button>
      </div>
    )
  }

  const timesFiltrados = times
    .filter((t) => {
      const termo = buscaTime.trim().toLowerCase()
      if (!termo) return true
      return (
        t.nome.toLowerCase().includes(termo) ||
        t.sigla?.toLowerCase().includes(termo) ||
        t.liga_nome?.toLowerCase().includes(termo)
      )
    })
    .slice(0, 80)

  const perfilVisual =
    editando && form
      ? {
          ...perfil,
          avatar_url: form.removerAvatar ? null : form.avatarPreview || perfil.avatar_url,
        }
      : perfil

  const capaVisual =
    editando && form
      ? form.removerCapa
        ? null
        : form.capaPreview || perfil.capa_url
      : perfil.capa_url

  return (
    <div className="entrar py-6">
      <div className="flex items-center justify-between">
        <BotaoVoltar />
        {sessao && (
          <button
            type="button"
            onClick={() => {
              sair()
              navigate('/perfis')
            }}
            className="text-sm text-arena-muted active:text-white"
          >
            Trocar de perfil
          </button>
        )}
      </div>

      <div className="recorte mt-4 h-40 overflow-hidden border border-white/10">
        <Capa url={capaVisual} />
      </div>

      <div className="mt-[-2.5rem] pl-2">
        <Avatar perfil={perfilVisual} time={time} grande />
      </div>

      <h1 className="mt-3 font-display text-3xl font-bold">{perfil.nome}</h1>
      {time && <p className="text-sm text-arena-muted">Time do coração: {time.nome}</p>}

      {aviso && (
        <div className="card mt-4 border-arena-primary/40 text-sm text-arena-primary">{aviso}</div>
      )}

      <div className="card mt-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-arena-muted">Biografia</p>
        <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">
          {(editando && form ? form.biografia : perfil.biografia) || (
            <span className="text-arena-muted italic">Sem biografia.</span>
          )}
        </p>
      </div>

      {podeEditar && !editando && (
        <button type="button" onClick={abrirEdicao} className="btn-primary mt-4 w-full">
          Editar perfil
        </button>
      )}

      {!podeEditar && perfil.possui_senha && sessao?.id !== id && (
        <p className="mt-4 text-center text-xs text-arena-muted">
          Entre com o seu PIN para editar este perfil.
        </p>
      )}

      {editando && form && (
        <form onSubmit={salvar} className="card mt-4 space-y-5">
          <h2 className="font-display text-xl font-bold">Editar perfil</h2>

          <CampoImagem
            rotulo="Foto de perfil"
            atual={perfil.avatar_url}
            preview={form.avatarPreview}
            onArquivo={(a) => escolherImagem('avatar', a)}
            onRemover={() =>
              setForm((f) => ({ ...f, removerAvatar: true, avatarPreview: null, avatarB64: null }))
            }
          />

          <CampoImagem
            rotulo="Foto de capa"
            atual={perfil.capa_url}
            preview={form.capaPreview}
            onArquivo={(a) => escolherImagem('capa', a)}
            onRemover={() =>
              setForm((f) => ({ ...f, removerCapa: true, capaPreview: null, capaB64: null }))
            }
          />

          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-arena-muted">
              Biografia
            </label>
            <textarea
              className="input mt-2 min-h-24 resize-y"
              maxLength={600}
              placeholder="Conte um pouco sobre você..."
              value={form.biografia}
              onChange={(e) => setForm((f) => ({ ...f, biografia: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-arena-muted">
              Time do coração
            </label>
            <input
              className="input mt-2"
              placeholder="Buscar time por nome, sigla ou liga..."
              value={buscaTime}
              onChange={(e) => setBuscaTime(e.target.value)}
            />
            <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-white/10 divide-y divide-white/5">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, timeId: '' }))}
                className={`w-full px-3 py-2.5 text-left text-sm ${!form.timeId ? 'bg-arena-primary/10 text-arena-primary' : 'text-arena-muted'}`}
              >
                Sem time do coração
              </button>
              {timesFiltrados.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, timeId: t.id }))}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm ${form.timeId === t.id ? 'bg-arena-primary/10 text-arena-primary' : ''}`}
                >
                  {t.escudo_url ? (
                    <img src={t.escudo_url} alt="" className="size-6 object-contain" />
                  ) : (
                    <span className="size-6" />
                  )}
                  <span className="truncate">{t.nome}</span>
                </button>
              ))}
              {timesFiltrados.length === 0 && (
                <p className="px-3 py-3 text-sm text-arena-muted">Nenhum time encontrado.</p>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-arena-muted">
              Novo PIN (opcional)
            </label>
            <input
              className="input mt-2 text-center font-display text-xl tracking-[0.4em]"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              value={form.pinNovo}
              onChange={(e) =>
                setForm((f) => ({ ...f, pinNovo: e.target.value.replace(/\D/g, '').slice(0, 4) }))
              }
            />
            <p className="mt-1 text-xs text-arena-muted">
              Deixe vazio para manter o PIN atual. O PIN protege a edição do seu perfil.
            </p>
          </div>

          {erroForm && <p className="text-sm text-arena-danger">{erroForm}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setEditando(false)
                setForm(null)
              }}
              className="btn-ghost flex-1 text-center"
              disabled={salvando}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary flex-1 disabled:opacity-60" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
