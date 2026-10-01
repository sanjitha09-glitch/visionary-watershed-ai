-- Roles
create type public.app_role as enum ('super_admin','state_admin','district_officer','watershed_officer','field_monitor','analyst','viewer');

create table public.profiles (
  id uuid primary key,
  full_name text,
  department text,
  assigned_geography text,
  email text,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_admin(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('super_admin','state_admin'))
$$;

create policy "Own profile read" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin(auth.uid()));
create policy "Own profile update" on public.profiles for update to authenticated using (id = auth.uid());
create policy "Own roles read" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.is_admin(auth.uid()));

-- First user becomes super admin; others viewer
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, department)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.email, new.raw_user_meta_data->>'department');
  if not exists (select 1 from public.user_roles where role = 'super_admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'super_admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'viewer');
  end if;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Geography
create table public.states (id text primary key, name text not null, center_lat double precision not null, center_lng double precision not null);
create table public.districts (id text primary key, state_id text not null references public.states(id) on delete cascade, name text not null);
create table public.blocks (id text primary key, district_id text not null references public.districts(id) on delete cascade, name text not null);
create table public.watersheds (
  id text primary key,
  block_id text not null references public.blocks(id) on delete cascade,
  name text not null,
  area_ha numeric not null,
  center_lat double precision not null,
  center_lng double precision not null,
  boundary jsonb not null,
  drainage_km numeric,
  water_bodies int,
  data_origin text not null default 'reference_dataset',
  data_status text not null default 'archived',
  source text not null default 'JalDrishti reference dataset (development)',
  updated_at timestamptz not null default now()
);
create index on public.districts(state_id);
create index on public.blocks(district_id);
create index on public.watersheds(block_id);

create type public.intervention_type as enum ('check_dam','farm_pond','plantation','water_conservation','land_treatment','drainage_treatment','other');
create type public.monitoring_status as enum ('monitored','requires_review','data_incomplete','analysis_available','pending_validation');

create table public.interventions (
  id text primary key,
  watershed_id text not null references public.watersheds(id) on delete cascade,
  type intervention_type not null,
  village text not null,
  lat double precision not null,
  lng double precision not null,
  implemented_on date not null,
  status monitoring_status not null default 'pending_validation',
  evidence_count int not null default 0,
  data_origin text not null default 'reference_dataset',
  updated_at timestamptz not null default now()
);
create index on public.interventions(watershed_id);
create index on public.interventions(lat, lng);
create index on public.interventions(implemented_on);

do $$ declare t text; begin
  foreach t in array array['states','districts','blocks','watersheds','interventions'] loop
    execute format('grant select on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "Authenticated read" on public.%I for select to authenticated using (true)', t);
  end loop;
end $$;
create policy "Officers update interventions" on public.interventions for update to authenticated
 using (public.is_admin(auth.uid()) or public.has_role(auth.uid(),'district_officer') or public.has_role(auth.uid(),'watershed_officer') or public.has_role(auth.uid(),'field_monitor'));
grant update on public.interventions to authenticated;

-- Audit
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  user_email text,
  action text not null,
  entity text,
  status text not null default 'success',
  details jsonb,
  created_at timestamptz not null default now()
);
create index on public.audit_logs(created_at desc);
grant select, insert on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
create policy "Insert own audit" on public.audit_logs for insert to authenticated with check (user_id = auth.uid());
create policy "Admins read audit" on public.audit_logs for select to authenticated using (public.is_admin(auth.uid()) or user_id = auth.uid());

-- Seed reference geography
insert into public.states values
('TG','Telangana',17.9,79.2),('AP','Andhra Pradesh',15.6,79.4),('MH','Maharashtra',19.3,75.6),
('RJ','Rajasthan',26.4,74.2),('KA','Karnataka',14.7,76.1),('OD','Odisha',20.4,84.4);

insert into public.districts values
('TG-NLG','TG','Nalgonda'),('TG-MBN','TG','Mahabubnagar'),
('AP-ATP','AP','Anantapur'),('AP-KNL','AP','Kurnool'),
('MH-AHM','MH','Ahmednagar'),('MH-BED','MH','Beed'),
('RJ-AJM','RJ','Ajmer'),('RJ-BHL','RJ','Bhilwara'),
('KA-CTR','KA','Chitradurga'),('KA-TMK','KA','Tumakuru'),
('OD-KLH','OD','Kalahandi'),('OD-BLN','OD','Bolangir');

insert into public.blocks values
('TG-NLG-01','TG-NLG','Devarakonda'),('TG-NLG-02','TG-NLG','Chandur'),
('TG-MBN-01','TG-MBN','Jadcherla'),
('AP-ATP-01','AP-ATP','Kalyandurg'),('AP-ATP-02','AP-ATP','Rayadurg'),
('AP-KNL-01','AP-KNL','Pattikonda'),
('MH-AHM-01','MH-AHM','Parner'),('MH-AHM-02','MH-AHM','Sangamner'),
('MH-BED-01','MH-BED','Ashti'),
('RJ-AJM-01','RJ-AJM','Kekri'),('RJ-BHL-01','RJ-BHL','Mandalgarh'),
('KA-CTR-01','KA-CTR','Challakere'),('KA-TMK-01','KA-TMK','Madhugiri'),
('OD-KLH-01','OD-KLH','Thuamul Rampur'),('OD-BLN-01','OD-BLN','Titlagarh');

-- Watersheds: two per block, offset from block-derived center
with b as (
  select bl.id as block_id, bl.name as bname, s.center_lat, s.center_lng,
    row_number() over (order by bl.id) as rn
  from public.blocks bl join public.districts d on d.id = bl.district_id join public.states s on s.id = d.state_id
), w as (
  select b.*, g as idx,
    b.center_lat + ((b.rn % 5) - 2) * 0.35 + (g-1) * 0.12 as clat,
    b.center_lng + ((b.rn % 4) - 1.5) * 0.4 + (g-1) * 0.14 as clng
  from b cross join generate_series(1,2) g
)
insert into public.watersheds (id, block_id, name, area_ha, center_lat, center_lng, boundary, drainage_km, water_bodies)
select
  'WS-' || w.block_id || '-' || lpad(w.idx::text,2,'0'),
  w.block_id,
  w.bname || ' Micro-watershed ' || w.idx,
  (2800 + ((w.rn * 37 + w.idx * 113) % 4200))::numeric,
  w.clat, w.clng,
  jsonb_build_object('type','Polygon','coordinates', jsonb_build_array(jsonb_build_array(
    jsonb_build_array(w.clng-0.045, w.clat-0.020),
    jsonb_build_array(w.clng-0.010, w.clat-0.042),
    jsonb_build_array(w.clng+0.038, w.clat-0.030),
    jsonb_build_array(w.clng+0.050, w.clat+0.008),
    jsonb_build_array(w.clng+0.022, w.clat+0.040),
    jsonb_build_array(w.clng-0.028, w.clat+0.034),
    jsonb_build_array(w.clng-0.045, w.clat-0.020)))),
  (18 + ((w.rn * 11 + w.idx * 7) % 40))::numeric,
  (2 + ((w.rn + w.idx * 3) % 9))
from w;

-- Interventions: 5 per watershed
insert into public.interventions (id, watershed_id, type, village, lat, lng, implemented_on, status, evidence_count)
select
  'INT-' || substr(ws.id, 4) || '-' || lpad(g::text,2,'0'),
  ws.id,
  (array['check_dam','farm_pond','plantation','water_conservation','land_treatment','drainage_treatment','other']::intervention_type[])[1 + ((g + length(ws.id)) % 7)],
  (array['Kothapalle','Ramapuram','Gollapalli','Venkatapur','Malkapur','Shivnagar','Bhimavaram','Sitarampur'])[1 + ((g * 3 + length(ws.name)) % 8)],
  ws.center_lat + (((g * 7) % 5) - 2) * 0.012,
  ws.center_lng + (((g * 3) % 5) - 2) * 0.015,
  date '2022-01-15' + ((g * 97 + length(ws.id) * 13) % 900),
  (array['monitored','requires_review','data_incomplete','analysis_available','pending_validation']::monitoring_status[])[1 + ((g + length(ws.name)) % 5)],
  0
from public.watersheds ws cross join generate_series(1,5) g;
