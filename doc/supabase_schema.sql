-- voice-invoice 사용자/사업자 정보 테이블
-- Supabase 대시보드 → SQL Editor에서 실행

create table if not exists public.users (
  id text primary key,
  email text not null unique,
  password_hash text not null,
  name text not null,
  created_at timestamptz not null default now(),
  corp_num text,
  corp_name text,
  ceo_name text,
  addr text,
  biz_type text,
  biz_class text,
  contact_name text,
  contact_email text,
  contact_tel text,
  popbill_registered boolean default false,
  popbill_user_id text,
  cert_registered boolean default false
);

-- RLS: Service Role 키 사용 시 비활성화해도 됨. Anon 키 사용 시 아래 정책 필요.
-- alter table public.users enable row level security;
-- create policy "Allow all for service" on public.users for all using (true) with check (true);
