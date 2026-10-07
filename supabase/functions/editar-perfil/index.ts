// Copa dos Amigos - Edge Function: editar-perfil
// Permite que o jogador edite APENAS o próprio perfil, validando o PIN no servidor.
// Usa service_role (bypassa RLS), mas nunca confia nos dados do cliente:
// só aceita os campos permitidos e sempre revalida o PIN.
//
// Deploy: supabase functions deploy editar-perfil
// (a chave da football-data.org e a service_role nunca aparecem no front-end)

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TIPOS_IMAGEM = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const TAMANHO_MAXIMO_BASE64 = 3_500_000; // ~2,5 MB binários

function resposta(json: unknown, status = 200) {
  return new Response(JSON.stringify(json), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256Hex(texto: string): Promise<string> {
  const bytes = new TextEncoder().encode(texto);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function fazerUpload(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  perfilId: string,
  imagem: { base64: string; tipo: string },
): Promise<string> {
  if (!TIPOS_IMAGEM.includes(imagem.tipo)) {
    throw new Error("Formato de imagem não suportado. Use JPG, PNG, WEBP ou GIF.");
  }
  if (!imagem.base64 || imagem.base64.length > TAMANHO_MAXIMO_BASE64) {
    throw new Error("Imagem muito grande. O limite é 2,5 MB.");
  }

  const binario = Uint8Array.from(atob(imagem.base64), (c) => c.charCodeAt(0));
  const extensao = imagem.tipo.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const caminho = `${perfilId}/principal.${extensao}`;

  const { error } = await admin.storage.from(bucket).upload(caminho, binario, {
    contentType: imagem.tipo,
    upsert: true,
  });
  if (error) throw new Error("Falha no upload da imagem. Tente novamente.");

  const {
    data: { publicUrl },
  } = admin.storage.from(bucket).getPublicUrl(caminho);

  return publicUrl;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { perfil_id, pin } = body;

    if (!perfil_id || typeof pin !== "string" || pin.length < 4) {
      return resposta({ erro: "Dados incompletos para editar o perfil." }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: perfil, error: erroBusca } = await admin
      .from("perfis")
      .select("*")
      .eq("id", perfil_id)
      .single();

    if (erroBusca || !perfil) {
      return resposta({ erro: "Perfil não encontrado." }, 404);
    }

    if (!perfil.possui_senha || !perfil.senha_hash) {
      return resposta({ erro: "Este perfil não tem PIN e não pode ser editado." }, 403);
    }

    const hashRecebido = await sha256Hex(pin);
    if (hashRecebido !== perfil.senha_hash) {
      return resposta({ erro: "PIN incorreto." }, 401);
    }

    // Campos permitidos - tudo o que não estiver aqui é ignorado.
    const atualizacoes: Record<string, unknown> = {};

    if (typeof body.biografia === "string") {
      atualizacoes.biografia = body.biografia.slice(0, 600);
    }

    if (body.time_coracao_id !== undefined && body.time_coracao_id !== null) {
      const { data: time } = await admin
        .from("times")
        .select("id")
        .eq("id", body.time_coracao_id)
        .single();
      if (!time) {
        return resposta({ erro: "Time do coração inválido." }, 400);
      }
      atualizacoes.time_coracao_id = time.id;
    }

    if (body.remover_time_coracao === true) {
      atualizacoes.time_coracao_id = null;
    }

    if (body.pin_novo) {
      const pinNovo = String(body.pin_novo);
      if (!/^\d{4}$/.test(pinNovo)) {
        return resposta({ erro: "O novo PIN deve ter 4 dígitos." }, 400);
      }
      atualizacoes.senha_hash = await sha256Hex(pinNovo);
      atualizacoes.possui_senha = true;
    }

    if (body.avatar?.base64) {
      atualizacoes.avatar_url = await fazerUpload(admin, "avatars", perfil_id, body.avatar);
    }
    if (body.remover_avatar === true) {
      atualizacoes.avatar_url = null;
    }

    if (body.capa?.base64) {
      atualizacoes.capa_url = await fazerUpload(admin, "capas", perfil_id, body.capa);
    }
    if (body.remover_capa === true) {
      atualizacoes.capa_url = null;
    }

    if (Object.keys(atualizacoes).length === 0) {
      return resposta({ ok: true, perfil });
    }

    const { data: atualizado, error: erroUpdate } = await admin
      .from("perfis")
      .update(atualizacoes)
      .eq("id", perfil_id)
      .select("*")
      .single();

    if (erroUpdate) {
      return resposta({ erro: "Não foi possível salvar as alterações." }, 500);
    }

    return resposta({ ok: true, perfil: atualizado });
  } catch {
    return resposta({ erro: "Erro ao processar a solicitação. Tente novamente." }, 500);
  }
});
