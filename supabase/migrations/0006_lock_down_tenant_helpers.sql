-- The tenant helpers are internal to RLS policies, not public API. Stop `anon`
-- (and the implicit PUBLIC grant) from calling them via /rest/v1/rpc/*.
--
-- `authenticated` MUST keep EXECUTE: the shop-scoped RLS policies invoke these on
-- every query, so revoking it there would break all reads. (The advisor's 0029
-- "authenticated can execute" warning is therefore expected and accepted.)
revoke execute on function public.current_shop_id() from public, anon;
revoke execute on function public.is_owner() from public, anon;
grant execute on function public.current_shop_id() to authenticated, service_role;
grant execute on function public.is_owner() to authenticated, service_role;
