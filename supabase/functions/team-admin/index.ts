// Team management for the Pulse admin panel.
// Only signed-in admins (profiles.is_admin) can call it. The service-role key
// stays inside Supabase and is never sent to the browser.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

// Readable temporary password, e.g. "Pulse-7kq4-Mx9t-2026"
function tempPassword() {
  const abc = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = (n: number) => Array.from(crypto.getRandomValues(new Uint32Array(n)), (x) => abc[x % abc.length]).join("");
  return `Pulse-${pick(4)}-${pick(4)}-${pick(4)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Who is calling, and are they an admin?
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: who } = await admin.auth.getUser(jwt);
  if (!who?.user) return json({ error: "Please sign in again." }, 401);
  const { data: me } = await admin.from("profiles").select("is_admin").eq("id", who.user.id).maybeSingle();
  if (!me?.is_admin) return json({ error: "Only admins can manage the team." }, 403);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty */ }
  const action = String(body.action || "");

  try {
    if (action === "list") {
      const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 500 });
      if (error) throw error;
      return json({ users: data.users.map((u) => ({ id: u.id, email: u.email, last_sign_in_at: u.last_sign_in_at })) });
    }

    if (action === "create") {
      const email = String(body.email || "").trim().toLowerCase();
      const full_name = String(body.full_name || "").trim() || null;
      const makeAdmin = body.is_admin !== false;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Enter a valid email address." }, 400);
      const password = tempPassword();
      const { data, error } = await admin.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { full_name },
      });
      if (error) {
        if (/already|registered|exists/i.test(error.message)) return json({ error: "Someone with this email already has a login. Find them in the list and turn on access." }, 409);
        throw error;
      }
      // The signup trigger creates the profile; make sure it exists and set name + access.
      const { error: pErr } = await admin.from("profiles").upsert({ id: data.user.id, full_name, is_admin: makeAdmin });
      if (pErr) throw pErr;
      return json({ id: data.user.id, email, password });
    }

    if (action === "reset_password") {
      const id = String(body.user_id || "");
      if (!id) return json({ error: "Missing user." }, 400);
      if (id === who.user.id) return json({ error: "Change your own password from the sign-in page instead." }, 400);
      const password = tempPassword();
      const { error } = await admin.auth.admin.updateUserById(id, { password });
      if (error) throw error;
      return json({ password });
    }

    if (action === "delete") {
      const id = String(body.user_id || "");
      if (!id) return json({ error: "Missing user." }, 400);
      if (id === who.user.id) return json({ error: "You can't delete your own login." }, 400);
      // Their enquiries stay, just unassigned.
      const { error: uErr } = await admin.from("enquiries").update({ assigned_to: null }).eq("assigned_to", id);
      if (uErr) throw uErr;
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) throw error;
      return json({ ok: true });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (e) {
    console.error(action, e);
    return json({ error: (e as Error).message || "Something went wrong." }, 500);
  }
});
