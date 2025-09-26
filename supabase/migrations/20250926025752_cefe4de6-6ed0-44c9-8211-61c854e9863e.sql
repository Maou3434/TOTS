-- Enable RLS on players table
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for players table
CREATE POLICY "Teams can view their own players" 
ON public.players 
FOR SELECT 
USING (true);

CREATE POLICY "Teams can insert their own players" 
ON public.players 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Teams can update their own players" 
ON public.players 
FOR UPDATE 
USING (true);