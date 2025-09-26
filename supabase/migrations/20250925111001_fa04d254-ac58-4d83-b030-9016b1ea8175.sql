-- Create enum types for the game
CREATE TYPE public.character_class AS ENUM ('warrior', 'mage', 'archer', 'assassin', 'paladin', 'berserker');
CREATE TYPE public.dungeon_rank AS ENUM ('E', 'D', 'C', 'B', 'A', 'S');
CREATE TYPE public.item_rarity AS ENUM ('common', 'uncommon', 'rare', 'epic', 'legendary');
CREATE TYPE public.item_type AS ENUM ('skill', 'artifact', 'set_piece');
CREATE TYPE public.attempt_status AS ENUM ('pending', 'approved', 'rejected');

-- Create teams table
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_name TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  stamina INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create players table
CREATE TABLE public.players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  character_class character_class NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  experience INTEGER NOT NULL DEFAULT 0,
  health INTEGER NOT NULL DEFAULT 100,
  mana INTEGER NOT NULL DEFAULT 50,
  attack INTEGER NOT NULL DEFAULT 10,
  defense INTEGER NOT NULL DEFAULT 5,
  equipped_skill UUID REFERENCES public.inventory(id) ON DELETE SET NULL,
  equipped_artifacts UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create dungeons table
CREATE TABLE public.dungeons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  rank dungeon_rank NOT NULL,
  description TEXT,
  min_level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create dungeon attempts table
CREATE TABLE public.dungeon_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  dungeon_id UUID NOT NULL REFERENCES public.dungeons(id) ON DELETE CASCADE,
  status attempt_status NOT NULL DEFAULT 'pending',
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewer_notes TEXT
);

-- Create inventory table
CREATE TABLE public.inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  item_type item_type NOT NULL,
  item_name TEXT NOT NULL,
  rarity item_rarity NOT NULL,
  description TEXT,
  stats JSONB,
  obtained_from UUID REFERENCES public.dungeon_attempts(id),
  obtained_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dungeons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dungeon_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teams
CREATE POLICY "Teams can view their own data" ON public.teams
  FOR SELECT USING (true);

CREATE POLICY "Teams can insert their own data" ON public.teams
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Teams can update their own data" ON public.teams
  FOR UPDATE USING (true);

-- RLS Policies for players
CREATE POLICY "Anyone can view players" ON public.players
  FOR SELECT USING (true);

CREATE POLICY "Teams can create their own players" ON public.players
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Teams can update their own players" ON public.players
  FOR UPDATE USING (true);

-- RLS Policies for dungeons (public read)
CREATE POLICY "Anyone can view dungeons" ON public.dungeons
  FOR SELECT USING (true);

-- RLS Policies for dungeon attempts
CREATE POLICY "Teams can view their own attempts" ON public.dungeon_attempts
  FOR SELECT USING (true);

CREATE POLICY "Teams can create attempts" ON public.dungeon_attempts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all attempts" ON public.dungeon_attempts
  FOR ALL USING (true);

-- RLS Policies for inventory
CREATE POLICY "Teams can view their own inventory" ON public.inventory
  FOR SELECT USING (true);

CREATE POLICY "System can insert inventory items" ON public.inventory
  FOR INSERT WITH CHECK (true);

-- Insert sample dungeons
INSERT INTO public.dungeons (name, rank, description, min_level) VALUES
  ('Goblin Cave', 'E', 'A simple cave filled with weak goblins. Perfect for beginners.', 1),
  ('Dark Forest', 'E', 'A mysterious forest where shadows lurk behind every tree.', 1),
  ('Abandoned Mine', 'D', 'An old mine shaft with dangerous creatures and valuable ore.', 3),
  ('Orc Stronghold', 'D', 'A fortified position held by a clan of warrior orcs.', 5),
  ('Crystal Caverns', 'C', 'Beautiful but deadly caves filled with crystal elementals.', 8),
  ('Undead Crypt', 'C', 'Ancient burial grounds where the dead refuse to rest.', 10),
  ('Dragon Lair', 'B', 'The home of a young dragon and its treasure hoard.', 15),
  ('Demon Gate', 'B', 'A portal to the underworld guarded by lesser demons.', 18),
  ('Titan Ruins', 'A', 'The remnants of an ancient civilization of giants.', 25),
  ('Void Nexus', 'A', 'A tear in reality where dark magic runs wild.', 30),
  ('World Tree', 'S', 'The mythical tree that connects all realms.', 40),
  ('Chaos Realm', 'S', 'The ultimate challenge where reality itself breaks down.', 50);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();