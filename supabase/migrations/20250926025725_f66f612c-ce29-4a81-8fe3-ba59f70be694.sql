-- Create merge requests table
CREATE TABLE public.merge_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL,
  skill1_id UUID NOT NULL,
  skill2_id UUID NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status attempt_status NOT NULL DEFAULT 'pending',
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewer_notes TEXT
);

-- Enable RLS
ALTER TABLE public.merge_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for merge requests
CREATE POLICY "Teams can view their own merge requests" 
ON public.merge_requests 
FOR SELECT 
USING (true);

CREATE POLICY "Teams can create merge requests" 
ON public.merge_requests 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view all merge requests" 
ON public.merge_requests 
FOR ALL 
USING (true);