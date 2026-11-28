-- Grant Data API privileges (RLS remains enforced on all tables)
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON public.campaigns TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.users_roles,
  public.campaigns,
  public.questions,
  public.quiz_attempts,
  public.quiz_action_logs,
  public.admin_audit_logs
TO authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
