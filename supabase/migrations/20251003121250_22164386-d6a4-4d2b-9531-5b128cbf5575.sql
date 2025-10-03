-- Criar enum para roles
create type public.app_role as enum ('admin', 'user');

-- Criar tabela user_roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Criar tabela de perfis
create table public.profiles (
  id uuid not null references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (id)
);

alter table public.profiles enable row level security;

-- Função para verificar role
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- Trigger para criar perfil e role padrão
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  
  insert into public.user_roles (user_id, role)
  values (new.id, 'user');
  
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS Policies para profiles
create policy "Users can view own profile" 
on public.profiles for select 
to authenticated using (auth.uid() = id);

create policy "Users can update own profile" 
on public.profiles for update 
to authenticated using (auth.uid() = id);

create policy "Admins can view all profiles" 
on public.profiles for select 
to authenticated using (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para user_roles
create policy "Users can view own roles" 
on public.user_roles for select 
to authenticated using (auth.uid() = user_id);

create policy "Admins can view all roles" 
on public.user_roles for select 
to authenticated using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can manage roles" 
on public.user_roles for all 
to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Trigger para atualizar updated_at em profiles
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();