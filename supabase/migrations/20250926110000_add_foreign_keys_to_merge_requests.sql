ALTER TABLE public.merge_requests
ADD CONSTRAINT merge_requests_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

ALTER TABLE public.merge_requests
ADD CONSTRAINT merge_requests_skill1_id_fkey FOREIGN KEY (skill1_id) REFERENCES public.inventory(id) ON DELETE CASCADE;

ALTER TABLE public.merge_requests
ADD CONSTRAINT merge_requests_skill2_id_fkey FOREIGN KEY (skill2_id) REFERENCES public.inventory(id) ON DELETE CASCADE;