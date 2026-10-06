import { useState } from 'react'

const CHAVE = 'copa:perfil'

function lerSessao() {
  try {
    const bruto = localStorage.getItem(CHAVE)
    return bruto ? JSON.parse(bruto) : null
  } catch {
    return null
  }
}

export function obterSessao() {
  return lerSessao()
}

export function useSessaoJogador() {
  const [sessao, setSessao] = useState(lerSessao)

  function entrar(perfil, pin = null) {
    const nova = { id: perfil.id, nome: perfil.nome }
    if (pin) nova.pin = pin
    localStorage.setItem(CHAVE, JSON.stringify(nova))
    setSessao(nova)
  }

  function sair() {
    localStorage.removeItem(CHAVE)
    setSessao(null)
  }

  return {
    sessao,
    podeEditar: Boolean(sessao?.pin),
    entrar,
    sair,
  }
}
