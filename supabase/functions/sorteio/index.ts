// Copa dos Amigos - Edge Function: sorteio
// Executa o sorteio de times no servidor, de forma atômica.
// Por que aqui: a linha do tempo animada roda no navegador do admin (limitação
// de 150s/400s do runtime não permite rodar o show inteiro no servidor), mas a
// DECISÃO e a GRAVAÇÃO acontecem aqui — a aba do admin pode fechar no meio que
// qualquer admin termina o sorteio por servidor, sem depender do navegador.
//
// Ações:
//   { torneio_id, acao: "lote" }      -> sorteia todo mundo de uma vez
//   { torneio_id, acao: "concluir" }  -> completa quem ainda não tem time e encerra
//
// Deploy: supabase functions deploy sorteio

import { createClient } from "npm:@supabase/supabase-js@2";
import { embaralhar, sortearTime } from "../../../src/lib/sorteio.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function resposta(json: unknown, status = 200) {
  return new Response(JSON.stringify(json), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const torneioId = body?.torneio_id;
    const acao = body?.acao;

    if (!torneioId || (acao !== "lote" && acao !== "concluir")) {
      return resposta({ erro: "Requisição de sorteio inválida." }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Só administradores autenticados passam.
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer /, "");
    const {
      data: { user },
      error: erroAuth,
    } = await admin.auth.getUser(token);
    if (erroAuth || !user) {
      return resposta({ erro: "Sessão expirada. Entre novamente como administrador." }, 401);
    }
    const { data: administrador } = await admin
      .from("administradores")
      .select("usuario_id")
      .eq("usuario_id", user.id)
      .maybeSingle();
    if (!administrador) {
      return resposta({ erro: "Acesso restrito ao administrador." }, 403);
    }

    const [
      { data: torneio, error: erroTorneio },
      { data: participantes, error: erroParticipantes },
      { data: linhasTimes, error: erroTimes },
    ] = await Promise.all([
      admin.from("torneios").select("*").eq("id", torneioId).single(),
      admin
        .from("participantes")
        .select("id, perfil_id, time_id, ordem_sorteio")
        .eq("torneio_id", torneioId)
        .order("criado_em", { ascending: true }),
      admin
        .from("torneio_times")
        .select("time_id")
        .eq("torneio_id", torneioId)
        .eq("disponivel", true),
    ]);

    if (erroTorneio || !torneio) {
      return resposta({ erro: "Torneio não encontrado." }, 404);
    }

    const info = torneio.config?.sorteio ?? {};
    if (info.status !== "agendado") {
      return resposta({ erro: "Agende o sorteio antes de executá-lo." }, 400);
    }

    if (erroParticipantes || !participantes || participantes.length === 0) {
      return resposta({ erro: "Inscreva ao menos um participante antes de sortear." }, 400);
    }

    const pool = (erroTimes ? [] : linhasTimes ?? []).map((linha) => ({ time_id: linha.time_id }));
    if (pool.length === 0) {
      return resposta({ erro: "Nenhum time habilitado. Habilite ligas e times na edição do torneio." }, 400);
    }

    const repetir = Boolean(torneio.config?.regras?.timesRepetidos);
    if (!repetir && participantes.length > pool.length) {
      return resposta(
        {
          erro: `Times insuficientes: ${participantes.length} participantes e apenas ${pool.length} times. Habilite mais times ou ative "Permitir times repetidos".`,
        },
        400,
      );
    }

    // A ordem fica gravada no agendamento; sem ela (ou se a lista mudou), sorteia de novo.
    const ordemValida =
      Array.isArray(info.ordem) &&
      info.ordem.length === participantes.length &&
      info.ordem.every((id) => participantes.some((p) => p.id === id));
    const ordem = ordemValida ? info.ordem : embaralhar(participantes.map((p) => p.id));

    const porId = new Map(participantes.map((p) => [p.id, p]));
    const usados = participantes.filter((p) => p.time_id).map((p) => p.time_id);
    const novos = [];

    for (let indice = 0; indice < ordem.length; indice += 1) {
      const participante = porId.get(ordem[indice]);
      if (!participante || participante.time_id) continue;

      const escolhido = sortearTime(pool, usados, repetir);
      if (!escolhido) break;
      usados.push(escolhido.time_id);
      novos.push({ id: participante.id, time_id: escolhido.time_id, ordem: indice + 1 });
    }

    const faltando =
      participantes.filter((p) => !p.time_id).length - novos.length;
    if (faltando > 0) {
      return resposta({ erro: "Não foi possível sortear times para todos os participantes." }, 400);
    }

    for (const novo of novos) {
      const { error } = await admin
        .from("participantes")
        .update({ time_id: novo.time_id, ordem_sorteio: novo.ordem })
        .eq("id", novo.id)
        .is("time_id", null);
      if (error) {
        return resposta({ erro: "Não foi possível gravar o sorteio." }, 500);
      }
    }

    // Mantém o campo "selecionado" dos times em dia (mesma regra da tela).
    const todosComTime = participantes.every((p) => p.time_id) || novos.length > 0;
    const usadosFinais = [...new Set([
      ...participantes.filter((p) => p.time_id).map((p) => p.time_id),
      ...novos.map((n) => n.time_id),
    ])];
    await admin
      .from("torneio_times")
      .update({ selecionado: false })
      .eq("torneio_id", torneioId)
      .eq("selecionado", true);
    if (todosComTime && usadosFinais.length > 0) {
      await admin
        .from("torneio_times")
        .update({ selecionado: true })
        .eq("torneio_id", torneioId)
        .in("time_id", usadosFinais);
    }

    const concluido = participantes.every((p) => p.time_id || novos.some((n) => n.id === p.id));
    const sorteioFinal = {
      ...info,
      modo: info.modo ?? "individual",
      tempoPorPerfil: info.tempoPorPerfil ?? 5,
      intervalo: info.intervalo ?? 15,
      ordem,
      status: concluido ? "concluido" : info.status,
      realizadoEm: concluido ? new Date().toISOString() : info.realizadoEm,
    };

    const { error: erroTorneioUpdate } = await admin
      .from("torneios")
      .update({ config: { ...torneio.config, sorteio: sorteioFinal } })
      .eq("id", torneioId);
    if (erroTorneioUpdate) {
      return resposta({ erro: "Não foi possível concluir o sorteio." }, 500);
    }

    return resposta({ ok: true, concluido, sorteados: novos.length });
  } catch {
    return resposta({ erro: "Erro ao processar o sorteio. Tente novamente." }, 500);
  }
});
