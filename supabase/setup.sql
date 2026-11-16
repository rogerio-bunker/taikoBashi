-- Configuração do Supabase para o painel de tema do Taiko Bashi.
-- Rodar uma vez no SQL Editor do projeto.

-- 1) Administradores (quem pode alterar o tema)
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
-- Sem políticas: ninguém lê/escreve via API; gerenciado só pelo SQL Editor.

-- security definer para conseguir consultar admins mesmo com RLS ativo
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- 2) Tema do site (linha única, id = 1)
create table if not exists public.site_theme (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.site_theme enable row level security;

drop policy if exists "Tema é público" on public.site_theme;
create policy "Tema é público" on public.site_theme
  for select to anon, authenticated using (true);

drop policy if exists "Admins alteram o tema" on public.site_theme;
create policy "Admins alteram o tema" on public.site_theme
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

insert into public.site_theme (id, data) values (1, '{}'::jsonb)
on conflict (id) do nothing;

-- 3) Bucket público para as imagens de fundo (máx. 5 MB, só imagens)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('backgrounds', 'backgrounds', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins enviam fundos" on storage.objects;
create policy "Admins enviam fundos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'backgrounds' and public.is_admin());

drop policy if exists "Admins apagam fundos" on storage.objects;
create policy "Admins apagam fundos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'backgrounds' and public.is_admin());

-- 4) Depois de criar o usuário dela em Authentication > Users, rodar:
-- insert into public.admins (user_id)
-- select id from auth.users where email = 'EMAIL_DELA_AQUI';
