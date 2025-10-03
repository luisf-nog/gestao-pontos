-- Criar tabela de empresas
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  daily_rate decimal(10,2) not null,
  overtime_rate decimal(10,2) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.companies enable row level security;

-- Criar tabela de funcionários
create table public.employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade not null,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.employees enable row level security;

-- Criar tabela de registros de ponto
create table public.time_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.employees(id) on delete cascade not null,
  date date not null,
  entry_time time not null,
  exit_time time not null,
  worked_hours decimal(10,2) not null,
  daily_value decimal(10,2) not null,
  overtime_value decimal(10,2) default 0,
  total_value decimal(10,2) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.time_records enable row level security;

-- RLS Policies para companies
create policy "Usuários autenticados podem ver empresas" 
on public.companies for select 
to authenticated using (true);

create policy "Apenas admins podem inserir empresas" 
on public.companies for insert 
to authenticated with check (public.has_role(auth.uid(), 'admin'));

create policy "Apenas admins podem atualizar empresas" 
on public.companies for update 
to authenticated using (public.has_role(auth.uid(), 'admin'));

create policy "Apenas admins podem deletar empresas" 
on public.companies for delete 
to authenticated using (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para employees
create policy "Usuários autenticados podem ver funcionários" 
on public.employees for select 
to authenticated using (true);

create policy "Apenas admins podem inserir funcionários" 
on public.employees for insert 
to authenticated with check (public.has_role(auth.uid(), 'admin'));

create policy "Apenas admins podem atualizar funcionários" 
on public.employees for update 
to authenticated using (public.has_role(auth.uid(), 'admin'));

create policy "Apenas admins podem deletar funcionários" 
on public.employees for delete 
to authenticated using (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para time_records
create policy "Usuários autenticados podem ver registros" 
on public.time_records for select 
to authenticated using (true);

create policy "Usuários autenticados podem inserir registros" 
on public.time_records for insert 
to authenticated with check (true);

create policy "Usuários autenticados podem atualizar registros" 
on public.time_records for update 
to authenticated using (true);

create policy "Usuários autenticados podem deletar registros" 
on public.time_records for delete 
to authenticated using (true);

-- Triggers para atualizar updated_at
create trigger update_companies_updated_at
  before update on public.companies
  for each row execute function public.update_updated_at_column();

create trigger update_employees_updated_at
  before update on public.employees
  for each row execute function public.update_updated_at_column();

create trigger update_time_records_updated_at
  before update on public.time_records
  for each row execute function public.update_updated_at_column();