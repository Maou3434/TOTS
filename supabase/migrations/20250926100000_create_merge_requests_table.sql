CREATE TABLE public.merge_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    skill1_id uuid NOT NULL,
    skill2_id uuid NOT NULL,
    status public.attempt_status DEFAULT 'pending'::public.attempt_status NOT NULL,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_at timestamp with time zone,
    reviewer_notes text,
    CONSTRAINT merge_requests_pkey PRIMARY KEY (id),
    CONSTRAINT merge_requests_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE,
    CONSTRAINT merge_requests_skill1_id_fkey FOREIGN KEY (skill1_id) REFERENCES public.inventory(id) ON DELETE CASCADE,
    CONSTRAINT merge_requests_skill2_id_fkey FOREIGN KEY (skill2_id) REFERENCES public.inventory(id) ON DELETE CASCADE
);

ALTER TABLE public.merge_requests OWNER TO postgres;

GRANT ALL ON TABLE public.merge_requests TO supabase_admin;
GRANT ALL ON TABLE public.merge_requests TO service_role;
GRANT ALL ON TABLE public.merge_requests TO authenticated;
GRANT ALL ON TABLE public.merge_requests TO anon;