import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAdmin } from '../hooks/useAdmin'
import { arquivoParaBase64, limitarArquivo } from '../lib/imagem'
import CabecalhoAdmin from '../components/CabecalhoAdmin'
import Loading from '../components/Loading'

async function sha256Hex(texto) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto))
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function enviarImagem(bucket, perfilId, arquivo) {
  const problema = limitarArquivo(arquivo)
  if (problema) throw new Error(problema)

  const base64 = await arquivoParaBase64(arquivo)
  const binario = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  const extensao = arquivo.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg'
  const caminho = `${perfilId}/principal.${extensao}`

  const { error } = await supabase.storage
    .from(bucket)
    .upload(caminho, binario, { contentType: arquivo.type, upsert: true })
  if (error) throw new Error('Falha no upload da imagem.')

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(caminho)
  return publicUrl
}

function formVazio() {
  return {
    id: null,
    nome: '',
    biografia: '',
    timeId: '',
    pin: '',
    avatarArquivo: null,
    avatarPreview: null,
    capaArquivo: null,
    capaPreview: null,
    removerAvatar: false,
    removerCapa: false,
    removerPin: false,
  }
}

export default function AdminPerfis() {
  const { usuario } = useAdmin()

  const [perfis, setPerfis] = useState([])
  const [times, setTimes] = useState([])
  const [buscaTime, setBuscaTime] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [form, setForm] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [excluindoId, setExcluindoId] = useState(null)

  const carregarPerfis = useCallback(async () => {
    const [perfisRes, timesRes] = await Promise.all([
      supabase.from('perfis').select('*').order('nome'),
      supabase.from('times').select('id, nome, sigla, escudo_url, liga_nome').eq('ativo', true).order('nome'),
    ])
    return { perfis: perfisRes.data ?? [], times: timesRes.data ?? [] }
  }, [])

  useEffect(() => {
    let ativo = true
    carregarPerfis().then((resultado) => {
      if (!ativo) return
      setPerfis(resultado.perfis)
      setTimes(resultado.times)
      setCarregando(false)
    })
    return () => {
      ativo = false
    }
  }, [carregarPerfis])

  function mostrarAviso(texto) {
    setAviso(texto)
    setTimeout(() => setAviso(''), 4000)
  }

  async function escolherImagem(campo, arquivo) {
    const problema = limitarArquivo(arquivo)
    if (problema) {
      setErro(problema)
      return
    }
    setForm((f) => ({
      ...f,
      [campo === 'avatar' ? 'avatarArquivo' : 'capaArquivo']: arquivo,
      [campo === 'avatar' ? 'avatarPreview' : 'capaPreview']: URL.createObjectURL(arquivo),
      [campo === 'avatar' ? 'removerAvatar' : 'removerCapa']: false,
    }))
    setErro('')
  }

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    setSalvando(true)

    const nome = form.nome.trim()
    if (!nome) {
      setErro('Informe o nome do jogador.')
      setSalvando(false)
      return
    }

    if (form.pin && !/^\d{4}$/.test(form.pin)) {
      setErro('O PIN deve ter 4 dígitos.')
      setSalvando(false)
      return
    }

    try {
      let perfilId = form.id

      if (perfilId) {
        const atualizacoes = {
          nome,
          biografia: form.biografia,
          time_coracao_id: form.timeId || null,
        }
        if (form.pin) {
          atualizacoes.senha_hash = await sha256Hex(form.pin)
          atualizacoes.possui_senha = true
        }
        if (form.removerPin) {
          atualizacoes.senha_hash = null
          atualizacoes.possui_senha = false
        }
        if (form.removerAvatar) atualizacoes.avatar_url = null
        if (form.removerCapa) atualizacoes.capa_url = null

        const { error } = await supabase.from('perfis').update(atualizacoes).eq('id', perfilId)
        if (error) {
          if (error.code === '23505') setErro('Já existe um perfil com esse nome.')
          else setErro('Não foi possível salvar o perfil.')
          setSalvando(false)
          return
        }
      } else {
        const { data, error } = await supabase
          .from('perfis')
          .insert({
            nome,
            biografia: form.biografia,
            time_coracao_id: form.timeId || null,
            criado_por: usuario?.id ?? null,
            senha_hash: form.pin ? await sha256Hex(form.pin) : null,
            possui_senha: Boolean(form.pin),
          })
          .select('id')
          .single()

        if (error) {
          if (error.code === '23505') setErro('Já existe um perfil com esse nome.')
          else setErro('Não foi possível criar o perfil.')
          setSalvando(false)
          return
        }
        perfilId = data.id
      }

      const atualizacoesImagem = {}
      if (form.avatarArquivo) {
        atualizacoesImagem.avatar_url = await enviarImagem('avatars', perfilId, form.avatarArquivo)
      }
      if (form.capaArquivo) {
        atualizacoesImagem.capa_url = await enviarImagem('capas', perfilId, form.capaArquivo)
      }

      if (Object.keys(atualizacoesImagem).length > 0) {
        const { error } = await supabase.from('perfis').update(atualizacoesImagem).eq('id', perfilId)
        if (error) setErro('Perfil salvo, mas falhou o envio das imagens.')
      }

      const resultado = await carregarPerfis()
      setPerfis(resultado.perfis)
      setForm(null)
      mostrarAviso(form.id ? 'Perfil atualizado!' : 'Perfil criado!')
    } catch (e) {
      setErro(e.message || 'Não foi possível salvar o perfil.')
    }

    setSalvando(false)
  }

  async function excluir(perfil) {
    const { count } = await supabase
      .from('participantes')
      .select('id', { count: 'exact', head: true })
      .eq('perfil_id', perfil.id)

    if (count > 0) {
      setErro('Este perfil participa de campeonatos e não pode ser excluído.')
      setExcluindoId(null)
      return
    }

    const { error } = await supabase.from('perfis').delete().eq('id', perfil.id)
    if (error) {
      setErro('Não foi possível excluir o perfil.')
    } else {
      const resultado = await carregarPerfis()
      setPerfis(resultado.perfis)
      mostrarAviso('Perfil excluído.')
    }
    setExcluindoId(null)
  }

  const timesFiltrados = times.filter((t) => {
    const termo = buscaTime.trim().toLowerCase()
    if (!termo) return true
    return (
      t.nome.toLowerCase().includes(termo) ||
      t.sigla?.toLowerCase().includes(termo) ||
      t.liga_nome?.toLowerCase().includes(termo)
    )
  })

  return (
    <div className="entrar">
      <CabecalhoAdmin
        titulo="Gerenciar perfis"
        subtitulo="Crie e edite os perfis dos jogadores."
      />

      {aviso && (
        <div className="card mt-4 border-arena-primary/40 text-sm text-arena-primary">{aviso}</div>
      )}
      {erro && !form && <p className="mt-4 text-sm text-arena-danger">{erro}</p>}

      <button
        type="button"
        onClick={() => {
          setForm(formVazio())
          setErro('')
          setBuscaTime('')
        }}
        className="btn-primary mt-6 w-full text-center"
      >
        Criar novo perfil
      </button>

      {form && (
        <form onSubmit={salvar} className="card mt-4 space-y-4">
          <h2 className="font-display text-xl font-bold">
            {form.id ? 'Editar perfil' : 'Novo perfil'}
          </h2>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-widest text-arena-muted">
              Nome
            </span>
            <input
              className="input mt-1.5"
              placeholder="Ex.: Lucas"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              required
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-widest text-arena-muted">
              Biografia
            </span>
            <textarea
              className="input mt-1.5 min-h-20 resize-y"
              maxLength={600}
              placeholder="Opcional"
              value={form.biografia}
              onChange={(e) => setForm((f) => ({ ...f, biografia: e.target.value }))}
            />
          </label>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-arena-muted">
              Imagens
            </p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-arena-muted mb-1">Foto de perfil</p>
                <div className="flex items-center gap-2">
                  <div className="size-14 shrink-0 overflow-hidden rounded-full bg-arena-surface2 border border-white/10">
                    {(form.avatarPreview || form.avatarUrl) && !form.removerAvatar && (
                      <img src={form.avatarPreview ?? form.avatarUrl} alt="" className="size-full object-cover" />
                    )}
                  </div>
                  <div className="flex flex-col gap-1 text-xs">
                    <label className="btn-ghost !px-2 !py-1.5 cursor-pointer text-center">
                      Escolher
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const a = e.target.files?.[0]
                          if (a) escolherImagem('avatar', a)
                          e.target.value = ''
                        }}
                      />
                    </label>
                    {form.avatarPreview && (
                      <button
                        type="button"
                        className="text-arena-danger"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            avatarArquivo: null,
                            avatarPreview: null,
                            removerAvatar: true,
                          }))
                        }
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs text-arena-muted mb-1">Foto de capa</p>
                <div className="flex items-center gap-2">
                  <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-arena-surface2 border border-white/10">
                    {(form.capaPreview || form.capaUrl) && !form.removerCapa && (
                      <img src={form.capaPreview ?? form.capaUrl} alt="" className="size-full object-cover" />
                    )}
                  </div>
                  <div className="flex flex-col gap-1 text-xs">
                    <label className="btn-ghost !px-2 !py-1.5 cursor-pointer text-center">
                      Escolher
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const a = e.target.files?.[0]
                          if (a) escolherImagem('capa', a)
                          e.target.value = ''
                        }}
                      />
                    </label>
                    {form.capaPreview && (
                      <button
                        type="button"
                        className="text-arena-danger"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            capaArquivo: null,
                            capaPreview: null,
                            removerCapa: true,
                          }))
                        }
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-arena-muted">
              Time do coração
            </p>
            <input
              className="input mt-1.5"
              placeholder="Buscar time..."
              value={buscaTime}
              onChange={(e) => setBuscaTime(e.target.value)}
            />
            <select
              className="input mt-2"
              value={form.timeId}
              onChange={(e) => setForm((f) => ({ ...f, timeId: e.target.value }))}
            >
              <option value="" className="bg-arena-surface2">Sem time do coração</option>
              {timesFiltrados.map((t) => (
                <option key={t.id} value={t.id} className="bg-arena-surface2">
                  {t.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-arena-muted">
              PIN (opcional)
            </p>
            <div className="mt-1.5 flex items-center gap-3">
              <input
                className="input text-center font-display tracking-[0.4em]"
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                value={form.pin}
                onChange={(e) =>
                  setForm((f) => ({ ...f, pin: e.target.value.replace(/\D/g, '').slice(0, 4), removerPin: false }))
                }
              />
              {form.id && form.possuiSenha && !form.pin && (
                <button
                  type="button"
                  className="text-xs text-arena-danger shrink-0"
                  onClick={() => setForm((f) => ({ ...f, removerPin: true }))}
                >
                  {form.removerPin ? 'Manter PIN' : 'Remover PIN'}
                </button>
              )}
            </div>
            <p className="mt-1 text-xs text-arena-muted">
              Com PIN, o jogador pode editar o próprio perfil.
            </p>
          </div>

          {erro && <p className="text-sm text-arena-danger">{erro}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setForm(null)}
              className="btn-ghost flex-1 text-center"
              disabled={salvando}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary flex-1 disabled:opacity-60" disabled={salvando}>
              {salvando ? 'Salvando...' : form.id ? 'Salvar' : 'Criar perfil'}
            </button>
          </div>
        </form>
      )}

      {carregando && <Loading texto="Carregando perfis..." />}

      {!carregando && perfis.length === 0 && !form && (
        <div className="card mt-6 text-center">
          <p className="font-display text-lg font-bold">Nenhum perfil criado</p>
          <p className="mt-1 text-sm text-arena-muted">Crie o primeiro perfil de jogador.</p>
        </div>
      )}

      {!carregando && perfis.length > 0 && (
        <div className="mt-6 space-y-3">
          {perfis.map((p) => (
            <div key={p.id} className="card flex items-center gap-3">
              <div className="size-11 shrink-0 overflow-hidden rounded-full bg-arena-surface2 border border-white/10 flex items-center justify-center font-display font-bold text-arena-primary">
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt="" className="size-full object-cover" />
                ) : (
                  p.nome?.[0]?.toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display font-bold leading-tight truncate">{p.nome}</p>
                <p className="text-xs text-arena-muted">
                  {p.possui_senha ? 'Com PIN' : 'Sem PIN'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setForm({
                    ...formVazio(),
                    id: p.id,
                    nome: p.nome,
                    biografia: p.biografia ?? '',
                    timeId: p.time_coracao_id ?? '',
                    avatarUrl: p.avatar_url,
                    capaUrl: p.capa_url,
                    possuiSenha: p.possui_senha,
                  })
                  setErro('')
                  setBuscaTime('')
                }}
                className="btn-ghost !px-3 !py-2 text-xs shrink-0"
              >
                Editar
              </button>
              {excluindoId === p.id ? (
                <button
                  type="button"
                  onClick={() => excluir(p)}
                  className="rounded-xl bg-arena-danger/15 border border-arena-danger/40 px-3 py-2 text-xs font-semibold text-arena-danger shrink-0"
                >
                  Confirmar?
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setExcluindoId(p.id)}
                  className="rounded-xl border border-white/10 px-3 py-2 text-xs text-arena-muted shrink-0 active:text-arena-danger"
                >
                  Excluir
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
