-- When someone books a discovery call on the public website, mark that time slot as taken.
--
-- Why: the website used to run "update available_slots set is_booked = true" itself, but the
-- public (anon) key is only allowed to read slots, so that update was silently refused and the
-- same time stayed open for the next visitor. A trigger does it safely on the database side.
--
-- Run once in the Supabase SQL editor. Safe to re-run.

create or replace function public.mark_slot_booked() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.slot_id is not null then
    update public.available_slots set is_booked = true where id = new.slot_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_mark_slot_booked on public.bookings;
create trigger trg_mark_slot_booked
  after insert on public.bookings
  for each row execute function public.mark_slot_booked();

-- Two people cannot hold the same slot at once (a declined booking frees it again).
create unique index if not exists bookings_one_open_per_slot
  on public.bookings (slot_id)
  where slot_id is not null and status in ('pending', 'confirmed');
