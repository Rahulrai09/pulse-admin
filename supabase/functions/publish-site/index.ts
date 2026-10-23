// "Publish to website" for the Pulse admin panel.
// Admin-only. Starts the GitHub Action in Rahulrai09/pulse-website that copies admin data into
// the website files, and reports recent publish runs. Needs the secret GITHUB_PUBLISH_TOKEN
// (fine-grained token, repo pulse-website, permission "Actions: Read and write").
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const REPO = "Rahulrai09/pulse-website";
const WORKFLOW = "publish-from-admin.yml";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: who } = await admin.auth.getUser(jwt);
  if (!who?.user) return json({ error: "Please sign in again." }, 401);
  const { data: me } = await admin.from("profiles").select("is_admin, full_name").eq("id", who.user.id).maybeSingle();
  if (!me?.is_admin) return json({ error: "Only admins can publish." }, 403);

  const token = Deno.env.get("GITHUB_PUBLISH_TOKEN");
  if (!token) return json({ error: "Publishing isn't connected yet. Add the GITHUB_PUBLISH_TOKEN secret in Supabase (see the steps on this page).", setup: true }, 503);
  const gh = (path: string, init: RequestInit = {}) => fetch(`https://api.github.com/repos/${REPO}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "pulse-admin", ...(init.headers || {}) },
  });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty */ }

  try {
    if (body.action === "publish") {
      const by = (me.full_name || who.user.email || "admin").toString().slice(0, 60);
      const r = await gh(`/actions/workflows/${WORKFLOW}/dispatches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: "main", inputs: { requested_by: by, dry_run: body.dry_run === true ? "true" : "false" } }),
      });
      if (r.status === 204) return json({ ok: true });
      if (r.status === 401 || r.status === 403) return json({ error: "GitHub refused the publish token. It may have expired or lack 'Actions: Read and write' on pulse-website.", setup: true }, 502);
      return json({ error: `GitHub said ${r.status}: ${(await r.text()).slice(0, 200)}` }, 502);
    }

    if (body.action === "status") {
      const r = await gh(`/actions/workflows/${WORKFLOW}/runs?per_page=6`);
      if (r.status === 401 || r.status === 403) return json({ error: "GitHub refused the publish token. It may have expired.", setup: true }, 502);
      if (!r.ok) return json({ error: `GitHub said ${r.status}` }, 502);
      const d = await r.json();
      const runs = (d.workflow_runs || []).map((w: Record<string, unknown>) => ({
        id: w.id, status: w.status, conclusion: w.conclusion, created_at: w.created_at, updated_at: w.updated_at,
        url: w.html_url, title: w.display_title, event: w.event, result: null as string | null, notes: null as string | null,
      }));
      // What each recent run did (the publish script writes it as GitHub annotations)
      await Promise.all(runs.slice(0, 4).filter((w) => w.status === "completed").map(async (w) => {
        try {
          const j = await (await gh(`/actions/runs/${w.id}/jobs`)).json();
          const job = j.jobs?.[0]; if (!job) return;
          const path = `/check-runs/${job.id}/annotations`;
          let a = await gh(path);
          if (!a.ok) a = await fetch(`https://api.github.com/repos/${REPO}${path}`, { headers: { Accept: "application/vnd.github+json", "User-Agent": "pulse-admin" } });
          if (!a.ok) return;
          for (const x of await a.json()) {
            if (x.title === "Publish result") w.result = x.message;
            else if (x.title === "Publish notes") w.notes = x.message;
            else if (x.annotation_level === "failure" && !w.result) w.result = x.message;
          }
        } catch { /* optional detail */ }
      }));
      return json({ runs });
    }
    return json({ error: "Unknown action." }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message || "Something went wrong." }, 500);
  }
});
