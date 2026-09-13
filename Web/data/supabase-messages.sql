create table public.messages (
  id bigint generated always as identity primary key,
  nickname text not null check (char_length(nickname) between 1 and 20),
  message text not null check (char_length(message) between 1 and 300),
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "Anyone can read guestbook messages"
on public.messages for select
using (true);

create policy "Anyone can add a guestbook message"
on public.messages for insert
with check (
  char_length(nickname) between 1 and 20
  and char_length(message) between 1 and 300
);
