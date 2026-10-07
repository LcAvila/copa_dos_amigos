# Copa dos Amigos

Projeto mobile-first para campeonatos de futebol entre amigos, com sorteio de times, grupos, partidas, tabela e acompanhamento em tempo real.

## Stack

- React + Vite
- Tailwind CSS
- Supabase: PostgreSQL, Auth, Realtime e Storage
- football-data.org para ligas, times e escudos

## Instalação

```bash
npm install
cp .env.example .env
npm run dev
```

Preencha o `.env` com as credenciais do seu projeto Supabase.

## Banco de dados

No Supabase, execute o arquivo:

```text
supabase/schema.sql
```

Depois, insira seu usuário administrador na tabela `administradores`:

```sql
insert into administradores (usuario_id)
values ('SEU_USER_ID_DO_SUPABASE');
```

## Ligas e times (football-data.org)

A sincronização de ligas e times é feita pela Edge Function `consultar-ligas`,
que grava um cache local nas tabelas `ligas` e `times`. A chave da API nunca
chega ao front-end: ela vive apenas como secret do Supabase.

Para ativar a sincronização:

1. Crie a conta em <https://football-data.org> e copie o token da API.
2. Configure o secret do projeto:

```bash
supabase secrets set FOOTBALL_DATA_TOKEN=seu_token
```

Enquanto o secret não estiver configurado, a tela do torneio continua
funcionando com cadastro manual de ligas e times.

## Regras de acesso

- Administrador: único usuário com login; cria torneios, perfis, sorteios e lança resultados.
- Jogadores: criados pelo administrador.
- Visitantes: abrem o link e escolhem um perfil para visualizar.
- Perfil com PIN: pode editar foto, capa, biografia e time do coração.
"# copa_dos_amigos" 
