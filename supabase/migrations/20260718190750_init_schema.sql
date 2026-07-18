-- 1. Drop existing tables if they exist to start fresh
drop table if exists referrals cascade;
drop table if exists purchases cascade;
drop table if exists user_leagues cascade;
drop table if exists lesson_progress cascade;
drop table if exists streaks cascade;
drop table if exists words cascade;
drop table if exists lessons cascade;
drop table if exists users cascade;
drop function if exists increment_weekly_xp cascade;
drop function if exists generate_referral_code cascade;

-- 2. Create tables

-- Users Table
create table users (
  id bigserial primary key,
  supabase_uid uuid unique not null,
  email text unique not null,
  display_name text,
  native_lang text,
  is_email_verified boolean default false,
  fcm_token text,
  daily_goal_min integer default 15,
  referral_code text unique,
  referral_count integer default 0,
  is_premium boolean default false,
  premium_expires_at timestamptz,
  created_at timestamptz default now()
);

-- Referral Code Trigger Setup
create or replace function generate_referral_code()
returns trigger as $$
declare
  new_code text;
  exists_code boolean;
begin
  if new.referral_code is null then
    loop
      new_code := upper(substring(md5(random()::text) from 1 for 6));
      select exists(select 1 from users where referral_code = new_code) into exists_code;
      if not exists_code then
        new.referral_code := new_code;
        exit;
      end if;
    end loop;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trigger_generate_referral_code
before insert on users
for each row
execute function generate_referral_code();

-- Streaks Table
create table streaks (
  user_id bigint primary key references users(id) on delete cascade,
  current_streak integer default 0,
  longest_streak integer default 0,
  total_xp integer default 0,
  level integer default 1,
  last_activity date,
  created_at timestamptz default now()
);

-- Lessons Table
create table lessons (
  id bigserial primary key,
  title text not null,
  description text,
  direction text not null,
  module_order integer default 0,
  order_index integer default 0,
  is_premium boolean default false,
  skill_type text,
  word_count integer default 0,
  tier text,
  xp_reward integer default 20,
  created_at timestamptz default now()
);

-- Words Table
create table words (
  id bigserial primary key,
  lesson_id bigint references lessons(id) on delete cascade,
  tamil text,
  telugu text,
  english text,
  malayalam text,
  translit_tamil text,
  translit_telugu text,
  translit_malayalam text,
  category text,
  difficulty text,
  tier text,
  skill_type text,
  sort_order integer default 0,
  dravidian_note text,
  created_at timestamptz default now()
);

-- Lesson Progress Table
create table lesson_progress (
  id bigserial primary key,
  user_id uuid not null, -- Stores supabase_uid directly as per routes/progress.js
  lesson_id bigint references lessons(id) on delete cascade,
  direction text,
  listen_completed boolean default false,
  quiz_completed boolean default false,
  quiz_score integer default 0,
  quiz_total integer default 0,
  unlocked boolean default false,
  completed_at timestamptz,
  created_at timestamptz default now(),
  constraint unique_user_lesson unique (user_id, lesson_id)
);

-- User Leagues Table
create table user_leagues (
  user_id bigint primary key references users(id) on delete cascade,
  league text default 'bronze',
  weekly_xp integer default 0,
  promoted_at timestamptz,
  demoted_at timestamptz,
  last_reset_at timestamptz,
  created_at timestamptz default now()
);

-- Stored Procedure for weekly XP increments
create or replace function increment_weekly_xp(p_user_id bigint, p_xp integer)
returns void as $$
begin
  insert into user_leagues (user_id, weekly_xp, league)
  values (p_user_id, p_xp, 'bronze')
  on conflict (user_id)
  do update set weekly_xp = user_leagues.weekly_xp + p_xp;
end;
$$ language plpgsql;

-- Purchases Table
create table purchases (
  id bigserial primary key,
  user_id bigint references users(id) on delete cascade,
  purchase_token text unique not null,
  product_id text,
  purchase_state integer,
  is_acknowledged boolean default false,
  expires_at timestamptz,
  raw_receipt jsonb,
  created_at timestamptz default now()
);

-- Referrals Table
create table referrals (
  id bigserial primary key,
  referrer_id bigint references users(id) on delete cascade,
  referred_id bigint unique references users(id) on delete cascade,
  referral_code text not null,
  reward_days integer not null,
  created_at timestamptz default now()
);
