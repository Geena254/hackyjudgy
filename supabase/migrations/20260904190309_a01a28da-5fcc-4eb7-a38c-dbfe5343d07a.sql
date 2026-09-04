CREATE TABLE public.mcp_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id text NOT NULL,
  client_name text,
  user_email text,
  call_count integer NOT NULL DEFAULT 0,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE (user_id, client_id)
);

CREATE TABLE public.mcp_tool_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id text,
  tool text NOT NULL,
  ok boolean NOT NULL DEFAULT true,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX mcp_tool_calls_user_created_idx ON public.mcp_tool_calls (user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.mcp_clients TO authenticated;
GRANT ALL ON public.mcp_clients TO service_role;
GRANT SELECT, INSERT ON public.mcp_tool_calls TO authenticated;
GRANT ALL ON public.mcp_tool_calls TO service_role;

ALTER TABLE public.mcp_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_tool_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY mcp_clients_select_own_or_admin ON public.mcp_clients
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY mcp_clients_insert_own ON public.mcp_clients
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY mcp_clients_update_own_or_admin ON public.mcp_clients
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY mcp_tool_calls_select_own_or_admin ON public.mcp_tool_calls
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY mcp_tool_calls_insert_own ON public.mcp_tool_calls
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());