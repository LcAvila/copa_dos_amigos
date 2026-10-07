// Copa dos Amigos - Edge Function: consultar-ligas
// Proxy da football-data.org: sincroniza competições e times para o cache
// local (tabelas ligas/times) usando a service_role. A chave da API vive
// apenas no secret FOOTBALL_DATA_TOKEN e nunca aparece no front-end.
//
// Body: { acao: "ligas" }              -> baixa competições e retorna o catálogo
//       { acao: "times", liga_api_id } -> baixa times de uma competição
//
// Deploy: supabase functions deploy consultar-ligas
// Secrets: supabase secrets set FOOTBALL_DATA_TOKEN=...

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const API_BASE = "https://api.football-data.org/v4";

function resposta(json: unknown, status = 200) {
  return new Response(JSON.stringify(json), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function mapearTipo(type: unknown): "liga" | "copa" | "selecao" | "outra" {
  const t = String(type ?? "").toUpperCase();
  if (t === "LEAGUE") return "liga";
  if (t === "CUP") return "copa";
  if (t === "NATIONAL") return "selecao";
  return "outra";
}

async function chamarApi(caminho: string, token: string): Promise<Record<string, unknown>> {
  const respostaApi = await fetch(`${API_BASE}${caminho}`, {
    headers: { "X-Auth-Token": token, Accept: "application/json" },
  });
  if (!respostaApi.ok) {
    throw new Error(`football-data.org respondeu ${respostaApi.status}. Tente novamente em alguns minutos.`);
  }
  return await respostaApi.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Autenticação: apenas administradores do torneio podem sincronizar.
    const autor = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const {
      data: { user },
    } = await autor.auth.getUser();
    if (!user) {
      return resposta({ erro: "Autenticação necessária." }, 401);
    }
    const { data: vinculo } = await autor
      .from("administradores")
      .select("usuario_id")
      .eq("usuario_id", user.id)
      .maybeSingle();
    if (!vinculo) {
      return resposta({ erro: "Acesso restrito ao administrador." }, 403);
    }

    const body = await req.json().catch(() => ({}) as Record<string, unknown>);
    const acao = String(body.acao ?? "ligas");

    const token = Deno.env.get("FOOTBALL_DATA_TOKEN");
    if (!token) {
      return resposta({
        ok: false,
        erro: "A chave da football-data.org ainda não foi configurada no servidor (secret FOOTBALL_DATA_TOKEN). Enquanto isso, cadastre ligas e times manualmente.",
      }, 503);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (acao === "ligas") {
      const dados = await chamarApi("/competitions", token);
      const competicoes = Array.isArray(dados.competitions) ? dados.competitions : [];
      const linhas = competicoes
        .filter((c) => c && typeof c.id === "number" && typeof c.name === "string")
        .map((c) => ({
          api_id: c.id,
          nome: c.name,
          pais: c.area?.name ?? null,
          emblema_url: typeof c.emblem === "string" ? c.emblem : null,
          tipo: mapearTipo(c.type),
          fonte: "api",
        }));

      if (linhas.length > 0) {
        const { error } = await admin.from("ligas").upsert(linhas, { onConflict: "api_id" });
        if (error) {
          return resposta({ erro: "Não foi possível salvar o cache de ligas." }, 500);
        }
      }

      const { data: ligas } = await admin
        .from("ligas")
        .select("*")
        .eq("ativa", true)
        .order("pais", { ascending: true })
        .order("nome", { ascending: true });

      return resposta({ ok: true, ligas: ligas ?? [] });
    }

    if (acao === "times") {
      const apiId = Number(body.liga_api_id);
      if (!Number.isFinite(apiId)) {
        return resposta({ erro: "Liga inválida." }, 400);
      }

      const { data: liga } = await admin
        .from("ligas")
        .select("*")
        .eq("api_id", apiId)
        .maybeSingle();
      if (!liga) {
        return resposta({ erro: "Liga não encontrada no cache. Sincronize as ligas primeiro." }, 404);
      }

      const dados = await chamarApi(`/competitions/${apiId}/teams`, token);
      const equipe = Array.isArray(dados.teams) ? dados.teams : [];

      const { data: existentes } = await admin
        .from("times")
        .select("id, nome")
        .eq("liga_id", liga.id);
      const porNome = new Map(
        (existentes ?? []).map((t) => [t.nome.toLowerCase(), t.id as string]),
      );

      const inserir: Record<string, unknown>[] = [];
      const atualizar: Record<string, unknown>[] = [];
      for (const time of equipe) {
        if (!time || typeof time.name !== "string") continue;
        const linha = {
          nome: time.name,
          sigla: String(time.tla ?? time.shortName ?? "").slice(0, 8) || null,
          escudo_url: typeof time.crest === "string" ? time.crest : null,
          liga_id: liga.id,
          liga_nome: liga.nome,
          tipo: "clube",
        };
        const existenteId = porNome.get(time.name.toLowerCase());
        if (existenteId) {
          atualizar.push({ id: existenteId, ...linha });
        } else {
          inserir.push(linha);
        }
      }

      if (inserir.length > 0) {
        const { error } = await admin.from("times").insert(inserir);
        if (error) {
          return resposta({ erro: "Não foi possível salvar os times no cache." }, 500);
        }
      }
      if (atualizar.length > 0) {
        const { error } = await admin.from("times").upsert(atualizar, { onConflict: "id" });
        if (error) {
          return resposta({ erro: "Não foi possível atualizar os times no cache." }, 500);
        }
      }

      const { data: times } = await admin
        .from("times")
        .select("*")
        .eq("liga_id", liga.id)
        .eq("ativo", true)
        .order("nome", { ascending: true });

      return resposta({ ok: true, times: times ?? [] });
    }

    return resposta({ erro: "Ação desconhecida." }, 400);
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : "";
    if (mensagem.includes("football-data.org")) {
      return resposta({ ok: false, erro: mensagem }, 502);
    }
    return resposta({ erro: "Erro ao processar a solicitação. Tente novamente." }, 500);
  }
});
