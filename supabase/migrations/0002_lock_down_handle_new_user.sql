-- handle_new_user is a trigger-only function; it should not be callable via RPC.
-- Revoking EXECUTE clears the SECURITY DEFINER advisor warnings for anon/authenticated
-- (it can still run as the on_auth_user_created trigger, which executes as the definer).
revoke execute on function public.handle_new_user() from public, anon, authenticated;
