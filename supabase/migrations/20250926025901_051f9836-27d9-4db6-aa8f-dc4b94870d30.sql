-- Fix the remaining function search path issue
DROP FUNCTION IF EXISTS public.check_max_players() CASCADE;

CREATE OR REPLACE FUNCTION public.check_max_players()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM players WHERE team_id = NEW.team_id) >= 3 THEN
    RAISE EXCEPTION 'A team can only have up to 3 players';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;