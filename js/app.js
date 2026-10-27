/* Pulse Admin — manages the pulseio.in catalogue, website content and leads.
   Data and logins: Supabase (row-level security: only profiles.is_admin = true can change anything). */
(() => {
  "use strict";
  const CFG = window.PULSE_ADMIN;
  const R = window.RESOURCES;
  const sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true } });
  const PAGE = 25;

  /* ---------- helpers ---------- */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const debounce = (fn, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const slugify = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
  const fmtDT = (d) => d ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
  function ago(d) {
    if (!d) return "—";
    const s = (Date.now() - new Date(d).getTime()) / 1000;
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + " min ago";
    if (s < 86400) return Math.floor(s / 3600) + " h ago";
    if (s < 86400 * 30) return Math.floor(s / 86400) + " d ago";
    return fmtDate(d);
  }
  const waNum = (p) => { let d = String(p || "").replace(/\D/g, ""); if (d.length === 10) d = "91" + d; if (d.length === 11 && d[0] === "0") d = "91" + d.slice(1); return d; };
  const human = (s) => String(s || "").replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

  const ICONS = {
    home: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z", inbox: "M22 12h-6l-2 3h-4l-2-3H2M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z",
    calendar: "M3 5h18v16H3zM16 3v4M8 3v4M3 10h18", box: "M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8", grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
    tag: "M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8zM7 7h.01", layers: "M12 2l10 5-10 5L2 7zM2 17l10 5 10-5M2 12l10 5 10-5",
    award: "M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM8.2 13.9L7 23l5-3 5 3-1.2-9.1", truck: "M1 3h15v13H1zM16 8h4l3 3v5h-7zM5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
    globe: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20", image: "M3 3h18v18H3zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21",
    help: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01", bar: "M12 20V10M18 20V4M6 20v-4", camera: "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8", file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5",
    shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", plus: "M12 5v14M5 12h14", search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3", x: "M18 6L6 18M6 6l12 12",
    trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6", download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3", out: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
    menu: "M3 6h18M3 12h18M3 18h18", up: "M18 15l-6-6-6 6", down: "M6 9l6 6 6-6", wa: "M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.6A8.4 8.4 0 1 1 21 11.5z", phone: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.9.6 2.8.7a2 2 0 0 1 1.7 2z",
    mail: "M2 4h20v16H2zM22 6l-10 7L2 6", ext: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3", refresh: "M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0 1 14.8-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15",
  };
  const icon = (n, cls = "ic") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONS[n] || ""}"/></svg>`;

  function toast(msg, kind = "ok") {
    const el = document.createElement("div");
    el.className = "toast " + kind; el.setAttribute("role", "status"); el.textContent = msg;
    $("#toasts").appendChild(el);
    setTimeout(() => el.classList.add("out"), 2800); setTimeout(() => el.remove(), 3200);
  }
  function confirmBox(title, text, okLabel = "Delete") {
    return new Promise((res) => {
      const d = $("#confirm");
      $("#cTitle").textContent = title; $("#cText").textContent = text; $("#cOk").textContent = okLabel; $("#cOk").className = /delete|remove/i.test(okLabel) ? "btn danger-solid" : "btn";
      d.showModal();
      const done = (v) => { d.close(); $("#cOk").onclick = $("#cCancel").onclick = null; res(v); };
      $("#cOk").onclick = () => done(true); $("#cCancel").onclick = () => done(false);
      d.oncancel = () => done(false);
    });
  }
  const friendly = (e) => {
    const m = e?.message || String(e);
    if (/duplicate key.*slug/i.test(m)) return "That URL slug is already used. Change it and save again.";
    if (/duplicate key/i.test(m)) return "Something with that name already exists.";
    if (/violates foreign key/i.test(m)) return "This is still used somewhere else (for example by a product). Remove those links first.";
    if (/row-level security/i.test(m)) return "You don't have permission to do that. Ask an admin to check your access.";
    if (/JWT|session/i.test(m)) return "Your login has expired. Please sign in again.";
    if (/rate limit/i.test(m)) return "Too many emails sent in the last hour. Please wait about an hour, then try once more (check your inbox and spam first).";
    if (/Failed to fetch|NetworkError/i.test(m)) return "No internet connection. Check your network and try again.";
    return m;
  };

  /* ---------- state ---------- */
  const S = { me: null, profile: null, fk: {}, dirty: false };

  /* ---------- lookups (cached per session) ---------- */
  const LABEL = { categories: "name", product_types: "name", countries: "name", applications: "name", certifications: "name", profiles: "full_name", products: "name" };
  async function lookup(table, force) {
    if (S.fk[table] && !force) return S.fk[table];
    const label = LABEL[table] || "name";
    const cols = table === "product_types" ? `id,${label},category_id` : `id,${label}`;
    const { data, error } = await sb.from(table).select(cols).order(label, { ascending: true }).limit(1000);
    if (error) throw error;
    S.fk[table] = data.map((r) => ({ id: r.id, label: r[label] || "(no name)", category_id: r.category_id }));
    return S.fk[table];
  }
  const fkLabel = (table, id) => (S.fk[table] || []).find((x) => x.id === id)?.label || "—";
  const dropCache = (table) => { delete S.fk[table]; };

  /* ---------- images: resize + convert to WebP before upload ---------- */
  async function shrink(file, max = 1600) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
    const bmp = await createImageBitmap(file).catch(() => null);
    if (!bmp) return file;
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, "image/webp", 0.85));
    return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.\w+$/, "") + ".webp", { type: "image/webp" }) : file;
  }
  const IMG_TYPES = /^image\/(jpeg|png|webp|gif|avif)$/;
  const mb = (n) => n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";
  const cleanName = (n) => n.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "file";
  // Uploads an image (compressed to WebP, max 1600px) or a PDF. Returns { url, note }.
  async function upload(file, folder) {
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (isPdf) {
      if (file.size > 25 * 1024 * 1024) throw new Error(`That PDF is ${mb(file.size)}. The limit is 25 MB. Compress it (e.g. ilovepdf.com) and try again.`);
      const path = `${folder}/${cleanName(file.name)}-${Date.now().toString(36)}.pdf`;
      const { error } = await sb.storage.from(CFG.docBucket).upload(path, file, { cacheControl: "31536000", contentType: "application/pdf", upsert: false });
      if (error) throw error;
      return { url: sb.storage.from(CFG.docBucket).getPublicUrl(path).data.publicUrl, note: `PDF uploaded (${mb(file.size)})` };
    }
    if (!IMG_TYPES.test(file.type)) throw new Error("Use a JPG, PNG, WebP, GIF or AVIF image. For documents, upload a PDF.");
    if (file.size > 25 * 1024 * 1024) throw new Error(`That image is ${mb(file.size)}. Use one under 25 MB.`);
    const f = await shrink(file);
    if (f.size > 5 * 1024 * 1024) throw new Error("Image is still over 5 MB after compressing. Use a smaller image.");
    const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${folder}/${cleanName(file.name)}-${Date.now().toString(36)}.${ext}`;
    const { error } = await sb.storage.from(CFG.imageBucket).upload(path, f, { cacheControl: "31536000", contentType: f.type, upsert: false });
    if (error) throw error;
    return { url: sb.storage.from(CFG.imageBucket).getPublicUrl(path).data.publicUrl, note: f.size < file.size ? `Image uploaded (${mb(file.size)} → ${mb(f.size)})` : `Image uploaded (${mb(f.size)})` };
  }
  // Deletes files that live in our own storage (links to pulseio.in etc. are left alone).
  async function removeStored(urls) {
    const by = {};
    for (const u of urls.filter(Boolean)) {
      const m = String(u).match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
      if (m && [CFG.imageBucket, CFG.docBucket].includes(m[1])) (by[m[1]] ||= []).push(decodeURIComponent(m[2]));
    }
    await Promise.all(Object.entries(by).map(([b, paths]) => sb.storage.from(b).remove(paths).catch(() => null)));
  }
  // Lets any element accept dropped files.
  function dropZone(el, onFiles) {
    ["dragenter", "dragover"].forEach((t) => el.addEventListener(t, (e) => { if (![...(e.dataTransfer?.types || [])].includes("Files")) return; e.preventDefault(); el.classList.add("drop"); }));
    ["dragleave", "drop"].forEach((t) => el.addEventListener(t, () => el.classList.remove("drop")));
    el.addEventListener("drop", (e) => { if (!e.dataTransfer?.files?.length) return; e.preventDefault(); onFiles([...e.dataTransfer.files]); });
  }

  /* ---------- screens ---------- */
  const show = (id) => ["authView", "resetView", "denyView", "appView"].forEach((v) => ($("#" + v).hidden = v !== id));

  /* ---------- auth ---------- */
  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("#lBtn"); $("#lErr").textContent = ""; btn.disabled = true; btn.textContent = "Signing in…";
    const { error } = await sb.auth.signInWithPassword({ email: $("#lEmail").value.trim().toLowerCase(), password: $("#lPass").value });
    btn.disabled = false; btn.textContent = "Sign in";
    if (error) $("#lErr").textContent = /invalid/i.test(error.message) ? "That email and password don't match." : friendly(error);
  });
  $("#forgot").addEventListener("click", async () => {
    const email = $("#lEmail").value.trim().toLowerCase();
    if (!email) { $("#lErr").textContent = "Type your email above first, then click 'Forgot password'."; return; }
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    $("#lErr").textContent = error ? friendly(error) : "If that email has access, a reset link is on its way.";
  });
  $("#resetForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const a = $("#rp1").value, b = $("#rp2").value;
    if (a.length < 10) { $("#rErr").textContent = "Use at least 10 characters."; return; }
    if (a !== b) { $("#rErr").textContent = "The two passwords don't match."; return; }
    const { error } = await sb.auth.updateUser({ password: a });
    if (error) { $("#rErr").textContent = friendly(error); return; }
    toast("Password updated"); history.replaceState(null, "", location.pathname + "#/dashboard"); boot();
  });
  const signOut = async () => { await sb.auth.signOut(); location.hash = ""; show("authView"); };
  $("#denyOut").addEventListener("click", signOut);

  let booting = false;
  async function boot() {
    if (booting) return; booting = true;
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { show("authView"); return; }
      S.me = session.user;
      const { data: prof, error } = await sb.from("profiles").select("id,full_name,is_admin").eq("id", S.me.id).maybeSingle();
      if (error) { show("authView"); $("#lErr").textContent = friendly(error); return; }
      if (!prof?.is_admin) { $("#denyEmail").textContent = S.me.email; show("denyView"); return; }
      S.profile = prof;
      $("#meName").textContent = prof.full_name || S.me.email;
      $("#meEmail").textContent = S.me.email;
      show("appView"); buildNav(); route();
    } finally { booting = false; }
  }
  sb.auth.onAuthStateChange((ev) => {
    if (ev === "PASSWORD_RECOVERY") { show("resetView"); return; }
    if (ev === "SIGNED_IN" && $("#appView").hidden && $("#resetView").hidden) boot();
    if (ev === "SIGNED_OUT") show("authView");
  });

  /* ---------- navigation ---------- */
  function buildNav() {
    $("#nav").innerHTML = window.NAV.map((g) => `<div class="nav-group"><div class="nav-h">${esc(g.group)}</div>${g.items.map(([k, label, ic]) => `<a href="#/${k}" data-k="${k}">${icon(ic)}<span>${esc(label)}</span><b class="cnt" data-cnt="${k}"></b></a>`).join("")}</div>`).join("")
      + `<button class="nav-out" id="outBtn">${icon("out")}<span>Sign out</span></button>`;
    $("#outBtn").addEventListener("click", signOut);
    refreshBadges();
  }
  async function refreshBadges() {
    const [a, b, c] = await Promise.all([
      sb.from("enquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
      sb.from("demo_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      sb.from("job_applications").select("id", { count: "exact", head: true }).eq("status", "new"),
    ]);
    const set = (k, n) => { const el = $(`[data-cnt="${k}"]`); if (el) el.textContent = n ? n : ""; };
    set("enquiries", a.count); set("demo_requests", b.count); set("job_applications", c.count);
  }
  $("#menuBtn").addEventListener("click", () => document.body.classList.toggle("nav-open"));
  $("#scrim").addEventListener("click", () => document.body.classList.remove("nav-open"));
  window.addEventListener("beforeunload", (e) => { if (S.dirty) { e.preventDefault(); e.returnValue = ""; } });

  let lastHash = location.hash;
  window.addEventListener("hashchange", () => {
    if (S.dirty && !confirm("You have unsaved changes. Leave this page anyway?")) { history.replaceState(null, "", lastHash); return; }
    S.dirty = false; route();
  });
  function route() {
    lastHash = location.hash;
    document.body.classList.remove("nav-open");
    const [k = "dashboard", id] = location.hash.replace(/^#\/?/, "").split("/");
    $$("#nav a").forEach((a) => a.classList.toggle("on", a.dataset.k === k));
    const main = $("#main"); main.innerHTML = `<div class="loading"><span class="spin"></span>Loading…</div>`; main.scrollTop = 0; window.scrollTo(0, 0);
    const go = k === "dashboard" ? dashboard() : k === "enquiries" ? leads("enquiries") : k === "demo_requests" ? leads("demo_requests") : k === "team" ? team() : k === "publish" ? publish() : k === "job_applications" ? jobs()
      : R[k] ? (id ? form(k, id === "new" ? null : id) : list(k)) : Promise.resolve(main.innerHTML = `<div class="empty"><h2>Page not found</h2><a class="btn" href="#/dashboard">Go to dashboard</a></div>`);
    Promise.resolve(go).catch((e) => { main.innerHTML = `<div class="empty"><h2>Couldn't load this page</h2><p>${esc(friendly(e))}</p><button class="btn" onclick="location.reload()">Try again</button></div>`; });
    document.title = (($(`#nav a[data-k="${k}"] span`) || {}).textContent || "Pulse") + " · Pulse Admin";
  }

  /* ---------- dashboard ---------- */
  async function dashboard() {
    const main = $("#main");
    const week = new Date(Date.now() - 7 * 864e5).toISOString();
    const cnt = (t, f) => { let q = sb.from(t).select("id", { count: "exact", head: true }); if (f) q = f(q); return q; };
    const [eNew, eWeek, eAll, dPend, pAct, pDraft, recent, demos, statuses] = await Promise.all([
      cnt("enquiries", (q) => q.eq("status", "new")), cnt("enquiries", (q) => q.gte("created_at", week)), cnt("enquiries"),
      cnt("demo_requests", (q) => q.eq("status", "pending")), cnt("products", (q) => q.eq("status", "active")), cnt("products", (q) => q.eq("status", "draft")),
      sb.from("enquiries").select("id,name,company,phone,status,source,created_at,products(name)").order("created_at", { ascending: false }).limit(6),
      sb.from("demo_requests").select("id,name,company,preferred_date,status,location,products(name)").in("status", ["pending", "scheduled"]).order("preferred_date", { ascending: true, nullsFirst: false }).limit(6),
      sb.from("enquiries").select("status").limit(5000),
    ]);
    const by = {}; (statuses.data || []).forEach((r) => (by[r.status] = (by[r.status] || 0) + 1));
    const total = eAll.count || 0;
    const card = (n, l, href, tone = "") => `<a class="stat ${tone}" href="${href}"><b>${n ?? 0}</b><span>${l}</span></a>`;
    main.innerHTML = `
      <header class="ph"><div><h1>Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, ${esc((S.profile.full_name || S.me.email).split(" ")[0])}</h1><p class="muted">Here's what's happening on pulseio.in.</p></div>
        <a class="btn ghost" href="${esc(CFG.websiteUrl)}" target="_blank" rel="noopener">${icon("ext")} View website</a></header>
      <section class="stats">
        ${card(eNew.count, "New enquiries", "#/enquiries", eNew.count ? "hot" : "")}${card(eWeek.count, "Enquiries this week", "#/enquiries")}
        ${card(dPend.count, "Demos waiting", "#/demo_requests", dPend.count ? "hot" : "")}${card(pAct.count, "Live products", "#/products")}${card(pDraft.count, "Draft products", "#/products")}
      </section>
      <section class="two">
        <div class="panel"><div class="panel-h"><h2>Latest enquiries</h2><a href="#/enquiries">See all →</a></div>
          ${(recent.data || []).length ? `<ul class="feed">${recent.data.map((r) => `<li><a href="#/enquiries" data-open="${r.id}"><div><b>${esc(r.name)}</b>${r.company ? ` · ${esc(r.company)}` : ""}<small>${esc(r.products?.name || r.source || "General enquiry")}</small></div><div class="r"><span class="badge s-${esc(r.status)}">${esc(human(r.status))}</span><small>${ago(r.created_at)}</small></div></a></li>`).join("")}</ul>` : `<p class="muted pad">No enquiries yet.</p>`}
        </div>
        <div class="panel"><div class="panel-h"><h2>Upcoming demos</h2><a href="#/demo_requests">See all →</a></div>
          ${(demos.data || []).length ? `<ul class="feed">${demos.data.map((r) => `<li><a href="#/demo_requests"><div><b>${esc(r.name)}</b>${r.company ? ` · ${esc(r.company)}` : ""}<small>${esc(r.products?.name || "Product not chosen")}${r.location ? " · " + esc(r.location) : ""}</small></div><div class="r"><span class="badge s-${esc(r.status)}">${esc(human(r.status))}</span><small>${r.preferred_date ? fmtDate(r.preferred_date) : "No date"}</small></div></a></li>`).join("")}</ul>` : `<p class="muted pad">No demos waiting.</p>`}
        </div>
      </section>
      <section class="panel"><div class="panel-h"><h2>Enquiry pipeline</h2><span class="muted">${total} total</span></div>
        <div class="pipe">${[["new", "New"], ["contacted", "Contacted"], ["qualified", "Qualified"], ["converted", "Converted"], ["lost", "Lost"]].map(([k, l]) => { const n = by[k] || 0; return `<a href="#/enquiries" class="pipe-i" data-st="${k}"><span>${l}</span><div class="bar"><i class="s-${k}" style="width:${total ? Math.max(2, (n / total) * 100) : 0}%"></i></div><b>${n}</b></a>`; }).join("")}</div>
      </section>
      <section class="panel"><div class="panel-h"><h2>Quick actions</h2></div><div class="quick">
        <a class="btn" href="#/products/new">${icon("plus")} Add product</a><a class="btn ghost" href="#/banners/new">${icon("image")} Add banner</a>
        <a class="btn ghost" href="#/faqs/new">${icon("help")} Add FAQ</a><a class="btn ghost" href="#/distributors/new">${icon("truck")} Add distributor</a></div></section>`;
    $$(".pipe-i").forEach((a) => a.addEventListener("click", () => sessionStorage.setItem("enqStatus", a.dataset.st)));
    $$("[data-open]").forEach((a) => a.addEventListener("click", () => sessionStorage.setItem("enqOpen", a.dataset.open)));
  }

  /* ---------- generic list ---------- */
  function cell(c, row, res) {
    const v = row[c.name];
    if (c.type === "file") return `<td>${v ? `<a href="${esc(v)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${/\.pdf(\?|#|$)/i.test(v) ? "PDF" : "View"}</a>` : '<span class="muted">—</span>'}</td>`;
    if (c.type === "image") return `<td class="thumb${c.wide ? " wide" : ""}">${v ? `<img src="${esc(v)}" alt="" loading="lazy">` : `<span class="noimg">${icon("image")}</span>`}</td>`;
    if (c.fk) return `<td>${esc(fkLabel(c.fk, v))}</td>`;
    if (c.type === "badge") return `<td><span class="badge s-${esc(v)}">${esc(human(v))}</span></td>`;
    if (c.type === "bool") return `<td>${v ? `<span class="badge s-active">Yes</span>` : `<span class="badge s-inactive">No</span>`}</td>`;
    if (c.type === "ago") return `<td class="muted" title="${esc(fmtDT(v))}">${ago(v)}</td>`;
    if (c.type === "tel") return `<td>${v ? `<a href="tel:${esc(v)}" onclick="event.stopPropagation()">${esc(v)}</a>` : "—"}</td>`;
    if (c.type === "range") return `<td class="muted">${row[c.name] || row[c.to] ? `${row[c.name] ? fmtDate(row[c.name]) : "Any time"} → ${row[c.to] ? fmtDate(row[c.to]) : "No end"}` : "Always"}</td>`;
    if (c.type === "expiry") { if (!v) return `<td class="muted">No expiry</td>`; const days = (new Date(v) - Date.now()) / 864e5; return `<td><span class="badge ${days < 0 ? "s-lost" : days < 60 ? "s-pending" : "s-active"}">${days < 0 ? "Expired " : ""}${fmtDate(v)}</span></td>`; }
    if (c.type === "seo") { const n = (v || "").length; return `<td><span class="seo ${!n ? "bad" : n > c.max ? "warn" : "good"}">${n ? `${n}/${c.max}` : "Missing"}</span></td>`; }
    if (c.join) return `<td>${esc(c.join.map((k) => row[k]).filter(Boolean).join(", ") || "—")}</td>`;
    if (c.strong) return `<td><b>${esc(v || "(no name)")}</b>${c.sub && row[c.sub] ? `<small>${esc(row[c.sub])}</small>` : ""}</td>`;
    return `<td>${esc(v ?? "—")}</td>`;
  }
  const head = (c) => c.label || (c.type === "image" ? "" : c.fk ? human(c.fk.replace(/ies$/, "y").replace(/s$/, "")) : human(c.name));

  async function list(key) {
    const res = R[key], main = $("#main");
    const st = JSON.parse(sessionStorage.getItem("list:" + key) || "null") || { q: "", page: 0, f: {} };
    await Promise.all([...new Set([...res.list.filter((c) => c.fk).map((c) => c.fk), ...(res.filters || []).filter((f) => f.fk).map((f) => f.fk)])].map((t) => lookup(t)));
    const filters = await Promise.all((res.filters || []).map(async (f) => {
      let opts = f.options;
      if (f.fk) opts = S.fk[f.fk].map((x) => [x.id, x.label]);
      if (f.distinct) { const { data } = await sb.from(res.table).select(f.name).not(f.name, "is", null).limit(1000); opts = [...new Set((data || []).map((r) => r[f.name]))].sort().map((x) => [x, human(x)]); }
      return `<select data-f="${f.name}" aria-label="Filter by ${esc(human(f.name))}"><option value="">All ${esc(human(f.fk ? f.fk : f.name)).toLowerCase()}</option>${opts.map(([v, l]) => `<option value="${esc(v)}" ${st.f[f.name] === v ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
    }));
    main.innerHTML = `
      <header class="ph"><div><h1>${esc(res.title)}</h1><p class="muted" id="lcount"> </p></div><div class="row">${res.bulk ? `<label class="btn ghost">${icon("image")} ${esc(res.bulk.label)}<input type="file" id="bulkUp" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" multiple hidden></label>` : ""}<a class="btn" href="#/${key}/new">${icon("plus")} Add ${esc(res.one)}</a></div></header>
      ${res.bulk ? `<p class="note info" id="bulkNote">Tip: drop several photos onto the list below (or use the upload button) to add them all at once. Captions come from the file names, and you can edit them afterwards.</p>` : ""}
      <div class="toolbar"><label class="search">${icon("search")}<input type="search" id="q" placeholder="Search ${esc(res.title.toLowerCase())}…" value="${esc(st.q)}"></label>${filters.join("")}</div>
      <div class="tablewrap"><table class="tbl"><thead><tr>${res.list.map((c) => `<th>${esc(head(c))}</th>`).join("")}</tr></thead><tbody id="rows"><tr><td colspan="${res.list.length}" class="loading"><span class="spin"></span>Loading…</td></tr></tbody></table></div>
      <div class="pager" id="pager"></div>`;
    const save = () => sessionStorage.setItem("list:" + key, JSON.stringify(st));
    async function load() {
      const cols = [...new Set(["id", ...res.list.map((c) => c.name), ...res.list.map((c) => c.sub).filter(Boolean), ...res.list.flatMap((c) => c.join || []), ...res.list.map((c) => c.to).filter(Boolean)])];
      let q = sb.from(res.table).select(cols.join(","), { count: "exact" }).order(res.order[0], { ascending: res.order[1] }).order("id").range(st.page * PAGE, st.page * PAGE + PAGE - 1);
      if (st.q) q = q.or(res.search.map((c) => `${c}.ilike.%${st.q.replace(/[%,()]/g, " ")}%`).join(","));
      Object.entries(st.f).forEach(([k, v]) => { if (v) q = q.eq(k, v); });
      const { data, error, count } = await q;
      if (error) { $("#rows").innerHTML = `<tr><td colspan="${res.list.length}" class="err">${esc(friendly(error))}</td></tr>`; return; }
      $("#lcount").textContent = `${count} ${count === 1 ? res.one : res.title.toLowerCase()}`;
      $("#rows").innerHTML = data.length ? data.map((r) => `<tr tabindex="0" data-id="${r.id}">${res.list.map((c) => cell(c, r, res)).join("")}</tr>`).join("")
        : `<tr><td colspan="${res.list.length}"><div class="empty sm"><p>${st.q || Object.values(st.f).some(Boolean) ? "Nothing matches your search." : `No ${esc(res.title.toLowerCase())} yet.`}</p>${st.q || Object.values(st.f).some(Boolean) ? "" : `<a class="btn" href="#/${key}/new">${icon("plus")} Add the first ${esc(res.one)}</a>`}</div></td></tr>`;
      $$("#rows tr[data-id]").forEach((tr) => { const open = () => (location.hash = `#/${key}/${tr.dataset.id}`); tr.addEventListener("click", open); tr.addEventListener("keydown", (e) => e.key === "Enter" && open()); });
      pager(count, st, load, save);
    }
    $("#q").addEventListener("input", debounce((e) => { st.q = e.target.value.trim(); st.page = 0; save(); load(); }));
    $$("[data-f]").forEach((s) => s.addEventListener("change", () => { st.f[s.dataset.f] = s.value; st.page = 0; save(); load(); }));
    if (res.bulk) {
      const b = res.bulk, note = $("#bulkNote"), tip = note.innerHTML;
      const go = async (files) => {
        files = files.filter((f) => IMG_TYPES.test(f.type)); if (!files.length) return toast("Use JPG, PNG, WebP, GIF or AVIF images.", "err");
        let n = 0; note.innerHTML = `<span class="spin sm"></span> Uploading 0 of ${files.length}…`;
        const { count: have } = await sb.from(res.table).select("id", { count: "exact", head: true });
        const rows = (await Promise.all(files.map(async (f, k) => {
          try { const r = await upload(f, res.table); n++; note.innerHTML = `<span class="spin sm"></span> Uploading ${n} of ${files.length}…`;
            return { ...b.defaults, [b.field]: r.url, [b.caption]: f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim(), display_order: (have || 0) + k + 1 }; }
          catch (err) { toast(`${f.name}: ${friendly(err)}`, "err"); return null; }
        }))).filter(Boolean);
        if (rows.length) { const { error } = await sb.from(res.table).insert(rows); if (error) toast(friendly(error), "err"); else toast(`${rows.length} photo${rows.length > 1 ? "s" : ""} added`); }
        note.innerHTML = tip; load();
      };
      $("#bulkUp").addEventListener("change", (e) => { const fs = [...e.target.files]; e.target.value = ""; go(fs); });
      dropZone($(".tablewrap", main), go);
    }
    await load();
  }
  function pager(count, st, load, save) {
    const pages = Math.ceil(count / PAGE), el = $("#pager");
    if (pages <= 1) { el.innerHTML = ""; return; }
    el.innerHTML = `<button class="btn ghost sm" ${st.page === 0 ? "disabled" : ""} data-p="-1">← Previous</button><span>Page ${st.page + 1} of ${pages}</span><button class="btn ghost sm" ${st.page >= pages - 1 ? "disabled" : ""} data-p="1">Next →</button>`;
    $$("[data-p]", el).forEach((b) => b.addEventListener("click", () => { st.page += +b.dataset.p; save(); load(); window.scrollTo(0, 0); }));
  }

  /* ---------- generic form ---------- */
  function fieldHTML(f, v) {
    const id = "f_" + f.name, req = f.required ? " required" : "", lab = `<label for="${id}">${esc(f.label)}${f.required ? ' <i class="req">*</i>' : ""}</label>`;
    const help = f.help ? `<small class="help">${esc(f.help)}</small>` : "";
    const counter = f.max ? `<small class="counter" data-for="${id}" data-max="${f.max}"></small>` : "";
    const val = v ?? f.default ?? "";
    switch (f.type) {
      case "textarea": return `<div class="field">${lab}<textarea id="${id}" name="${f.name}" rows="${f.rows || 4}"${req}>${esc(val)}</textarea>${counter}${help}</div>`;
      case "select": return `<div class="field">${lab}<select id="${id}" name="${f.name}"${req}>${f.options.map(([o, l]) => `<option value="${esc(o)}" ${String(val) === o ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>${help}</div>`;
      case "fk": return `<div class="field">${lab}<select id="${id}" name="${f.name}" data-fk="${f.table}"${f.filterBy ? ` data-by="${f.filterBy}"` : ""}${req}><option value="">— Choose —</option>${(S.fk[f.table] || []).map((o) => `<option value="${o.id}" data-cat="${o.category_id || ""}" ${val === o.id ? "selected" : ""}>${esc(o.label)}</option>`).join("")}</select>${help}</div>`;
      case "bool": return `<div class="field check"><label class="switch"><input type="checkbox" id="${id}" name="${f.name}" ${(v ?? f.default) ? "checked" : ""}><span></span>${esc(f.label)}</label>${help}</div>`;
      case "number": return `<div class="field">${lab}<input type="number" id="${id}" name="${f.name}" value="${esc(val)}" ${f.min != null ? `min="${f.min}"` : ""} ${f.max != null ? `max="${f.max}"` : ""}${req}>${help}</div>`;
      case "date": return `<div class="field">${lab}<input type="date" id="${id}" name="${f.name}" value="${esc(val)}"${req}>${help}</div>`;
      case "image": return `<div class="field img-field" data-name="${f.name}" data-kind="image"${f.minWidth ? ` data-minw="${f.minWidth}"` : ""}>${lab}<div class="img-box" title="Drop an image here"></div><small class="img-info"></small>
          <div class="img-actions"><label class="btn ghost sm">${icon("plus")} <span class="up-l">Upload</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" hidden></label><button type="button" class="btn ghost sm danger" data-clear hidden>Remove</button></div>
          <input type="url" id="${id}" name="${f.name}" value="${esc(val)}" placeholder="…or paste an image link"${req}>${help}</div>`;
      case "file": return `<div class="field img-field wide" data-name="${f.name}" data-kind="${f.accept === "any" ? "any" : "pdf"}">${lab}<div class="file-box" title="Drop a file here"></div>
          <div class="img-actions"><label class="btn ghost sm">${icon("plus")} <span class="up-l">Upload</span><input type="file" accept="${f.accept === "any" ? "application/pdf,image/jpeg,image/png,image/webp" : "application/pdf"}" hidden></label><button type="button" class="btn ghost sm danger" data-clear hidden>Remove</button></div>
          <input type="url" id="${id}" name="${f.name}" value="${esc(val)}" placeholder="…or paste a link"${req}>${help}</div>`;
      case "specs": return `<div class="field wide" id="specs"></div>`;
      case "slug": return `<div class="field">${lab}<div class="slug"><span>/</span><input type="text" id="${id}" name="${f.name}" value="${esc(val)}" data-from="${f.from}" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" title="Lowercase letters, numbers and dashes only"${req}></div>${help}</div>`;
      default: return `<div class="field">${lab}<input type="${f.type === "email" ? "email" : f.type === "tel" ? "tel" : f.type === "url" ? "url" : "text"}" id="${id}" name="${f.name}" value="${esc(val)}" ${f.suggest ? `list="dl_${f.name}"` : ""}${req}>${f.suggest ? `<datalist id="dl_${f.name}"></datalist>` : ""}${counter}${help}</div>`;
    }
  }

  async function form(key, id) {
    const res = R[key], main = $("#main");
    await Promise.all([...new Set(res.fields.filter((f) => f.type === "fk").map((f) => f.table))].map((t) => lookup(t)));
    let row = {};
    if (id) {
      const { data, error } = await sb.from(res.table).select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) { main.innerHTML = `<div class="empty"><h2>Not found</h2><p>This ${esc(res.one)} may have been deleted.</p><a class="btn" href="#/${key}">Back to ${esc(res.title)}</a></div>`; return; }
      row = data;
    }
    const groups = {}; res.fields.forEach((f) => (groups[f.group || "Details"] ||= []).push(f));
    main.innerHTML = `
      <header class="ph"><div><a class="back" href="#/${key}">← ${esc(res.title)}</a><h1>${id ? esc(row.name || row.title || row.question || row.company_name || row.page_name || row.label || row.caption || "Edit " + res.one) : "New " + esc(res.one)}</h1>
        ${id && row.updated_at ? `<p class="muted">Last updated ${ago(row.updated_at)}</p>` : ""}</div>
        ${key === "products" && id && row.specifications?.page_url ? `<a class="btn ghost" target="_blank" rel="noopener" href="${esc(row.specifications.page_url)}">${icon("ext")} View on website</a>` : ""}
        ${key === "faqs" && id && row.page_url ? `<a class="btn ghost" target="_blank" rel="noopener" href="${esc(row.page_url)}">${icon("ext")} View page</a>` : ""}
        ${key === "website_pages" && id && row.file_path ? `<a class="btn ghost" target="_blank" rel="noopener" href="${esc(CFG.websiteUrl)}/${esc(row.file_path === "index.html" ? "" : row.file_path.replace(/^\//, ""))}">${icon("ext")} View page</a>` : ""}</header>
      <form id="frm" class="frm" novalidate>
        ${Object.entries(groups).map(([g, fs]) => `<section class="panel"><div class="panel-h"><h2>${esc(g)}</h2></div><div class="grid">${fs.map((f) => fieldHTML(f, row[f.name])).join("")}</div></section>`).join("")}
        <div id="extras"></div>
        <div class="savebar"><div>${id ? `<button type="button" class="btn ghost danger" id="del">${icon("trash")} Delete</button>` : ""}</div>
          <div><span class="muted" id="dirtyNote"></span><a class="btn ghost" href="#/${key}">Cancel</a><button class="btn" id="saveBtn" type="submit">${id ? "Save changes" : "Create " + esc(res.one)}</button></div></div>
      </form>`;
    const frm = $("#frm");
    wireForm(frm, res, row, !id);
    if (res.fields.some((f) => f.type === "specs")) specsEditor(row.specifications);
    if (res.extras && id) await productExtras(id);
    else if (res.extras) $("#extras").innerHTML = `<section class="panel"><p class="muted pad">Save the product first, then you can add more photos, applications and certifications.</p></section>`;
    frm.addEventListener("input", () => { S.dirty = true; $("#dirtyNote").textContent = "Unsaved changes"; });
    frm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!frm.checkValidity()) { const bad = frm.querySelector(":invalid"); bad.focus(); bad.reportValidity(); return; }
      const out = {};
      res.fields.forEach((f) => {
        if (f.type === "specs") { out[f.name] = readSpecs(row.specifications); return; }
        const el = frm.elements[f.name]; if (!el) return;
        if (f.type === "bool") out[f.name] = el.checked;
        else if (f.type === "number") out[f.name] = el.value === "" ? (f.default ?? null) : Number(el.value);
        else { const v = el.value.trim(); out[f.name] = v === "" ? null : v; }
      });
      const btn = $("#saveBtn"); btn.disabled = true; btn.textContent = "Saving…";
      const q = id ? sb.from(res.table).update(out).eq("id", id).select("id").single() : sb.from(res.table).insert(out).select("id").single();
      const { data, error } = await q;
      btn.disabled = false; btn.textContent = id ? "Save changes" : "Create " + res.one;
      if (error) { toast(friendly(error), "err"); return; }
      if (res.extras && id) { try { await saveProductLinks(id); } catch (e2) { toast(friendly(e2), "err"); return; } }
      S.dirty = false; dropCache(res.table); toast(id ? "Saved" : `${human(res.one)} created`);
      if (!id) location.hash = `#/${key}/${data.id}`; else { $("#dirtyNote").textContent = ""; Object.assign(row, out); }
    });
    if (id) $("#del").addEventListener("click", async () => {
      if (!(await confirmBox(`Delete this ${res.one}?`, "This can't be undone."))) return;
      const files = res.fields.filter((f) => f.type === "image" || f.type === "file").map((f) => row[f.name]);
      if (res.extras) { const { data: gi } = await sb.from("product_images").select("image_url").eq("product_id", id); files.push(...(gi || []).map((g) => g.image_url)); }
      if (res.extras) await Promise.all(["product_images", "product_applications", "product_certifications"].map((t) => sb.from(t).delete().eq("product_id", id)));
      const { error } = await sb.from(res.table).delete().eq("id", id);
      if (error) { toast(friendly(error), "err"); return; }
      await removeStored(files);
      S.dirty = false; dropCache(res.table); toast("Deleted"); location.hash = `#/${key}`;
    });
  }
  const fkSlug = (catId) => { const c = (S.fk.categories || []).find((x) => x.id === catId); return c ? slugify(c.label) : ""; };

  function wireForm(frm, res, row, isNew) {
    // slugs follow their source field until edited by hand
    $$("[data-from]", frm).forEach((s) => {
      const src = frm.elements[s.dataset.from]; let manual = !isNew && !!s.value;
      s.addEventListener("input", () => { manual = true; s.value = s.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"); });
      src?.addEventListener("input", () => { if (!manual) s.value = slugify(src.value); });
    });
    // character counters
    $$(".counter", frm).forEach((c) => { const el = $("#" + c.dataset.for), max = +c.dataset.max; const upd = () => { const n = el.value.length; c.textContent = `${n}/${max}`; c.className = "counter " + (n > max ? "warn" : n ? "good" : ""); }; el.addEventListener("input", upd); upd(); });
    // product type list follows the chosen category
    $$("[data-by]", frm).forEach((sel) => { const by = frm.elements[sel.dataset.by]; const upd = () => { $$("option[data-cat]", sel).forEach((o) => { o.hidden = !!by.value && !!o.dataset.cat && o.dataset.cat !== by.value; }); if (sel.selectedOptions[0]?.hidden) sel.value = ""; }; by.addEventListener("change", upd); upd(); });
    // suggestions from existing values
    $$("datalist", frm).forEach(async (dl) => { const col = dl.id.slice(3); const { data } = await sb.from(res.table).select(col).not(col, "is", null).limit(500); dl.innerHTML = [...new Set((data || []).map((r) => r[col]))].map((v) => `<option value="${esc(v)}">`).join(""); });
    // image uploads
    $$(".img-field", frm).forEach((box) => {
      const input = $("input[type=url]", box), file = $("input[type=file]", box), kind = box.dataset.kind;
      const preview = $(".img-box, .file-box", box), info = $(".img-info", box), minW = +box.dataset.minw || 0;
      const isPdfUrl = (u) => /\.pdf(\?|#|$)/i.test(u);
      const paint = () => {
        const u = input.value.trim();
        $(".up-l", box).textContent = u ? "Replace" : "Upload";
        $("[data-clear]", box).hidden = !u;
        if (kind === "image" || (kind === "any" && u && !isPdfUrl(u))) {
          preview.className = "img-box";
          preview.innerHTML = u ? `<img src="${esc(u)}" alt="">` : `<span class="noimg big">${icon("image")}</span><small>Drop an image here</small>`;
          if (info) info.textContent = "";
          const im = $("img", preview);
          if (im) {
            im.onload = () => { if (!info) return; const w = im.naturalWidth, h = im.naturalHeight; info.textContent = `${w} × ${h} px` + (minW && w < minW ? ` · smaller than the ${minW}px we recommend, may look blurry` : ""); info.classList.toggle("warn", !!(minW && w < minW)); };
            im.onerror = () => { preview.innerHTML = `<span class="noimg big">${icon("image")}</span><small class="warn">This image link doesn't load. Check it or upload the file.</small>`; };
          }
        } else {
          preview.className = "file-box";
          const name = u ? decodeURIComponent(u.split("/").pop().split("?")[0]) : "";
          preview.innerHTML = u ? `${icon("file")}<a href="${esc(u)}" target="_blank" rel="noopener">${esc(name)}</a>` : `${icon("file")}<span class="muted">No file yet. Drop a PDF here or click Upload.</span>`;
        }
      };
      const send = async (f) => {
        if (!f) return;
        if (kind === "image" && !IMG_TYPES.test(f.type)) return toast("Use a JPG, PNG, WebP, GIF or AVIF image.", "err");
        if (kind === "pdf" && !(f.type === "application/pdf" || /\.pdf$/i.test(f.name))) return toast("Please upload a PDF file.", "err");
        preview.innerHTML = `<span class="spin"></span><small>Uploading ${esc(f.name)}…</small>`;
        try { const r = await upload(f, res.table); input.value = r.url; paint(); S.dirty = true; $("#dirtyNote").textContent = "Unsaved changes"; toast(`${r.note}. Click Save to keep it.`); }
        catch (e) { toast(friendly(e), "err"); paint(); }
      };
      paint();
      input.addEventListener("change", paint);
      box.addEventListener("click", (e) => { if (e.target.closest("[data-clear]")) { input.value = ""; paint(); S.dirty = true; $("#dirtyNote").textContent = "Unsaved changes"; } });
      file.addEventListener("change", async () => { await send(file.files[0]); file.value = ""; });
      dropZone(preview, (fs) => send(fs[0]));
    });
  }

  /* ---------- product specifications editor ---------- */
  function specsEditor(spec) {
    spec = spec && typeof spec === "object" ? spec : {};
    const rows = Array.isArray(spec.specs) ? spec.specs : [];
    const feats = Array.isArray(spec.features) ? spec.features : [];
    const tags = Array.isArray(spec.tags) ? spec.tags : [];
    const other = Object.keys(spec).filter((k) => !["specs", "features", "tags"].includes(k));
    $("#specs").innerHTML = `
      <div class="sub-h"><b>Technical specifications</b><small class="help">Shown as a table on the product page. Use a section heading to split it into parts, e.g. "Controlled Parameters".</small></div>
      <div id="specRows">${(() => { let g = null; return rows.map((r) => { const h = (r.group || "") !== (g || "") && r.group ? specHead(r.group) : ""; g = r.group || g; return h + specRow(r.label ?? r.name ?? "", r.value ?? ""); }).join(""); })()}</div>
      <div class="row"><button type="button" class="btn ghost sm" id="addSpec">${icon("plus")} Add row</button><button type="button" class="btn ghost sm" id="addHead">${icon("plus")} Add section heading</button></div>
      <div class="sub-h"><b>Key features</b><small class="help">One per line.</small></div>
      <textarea id="featList" rows="5">${esc(feats.join("\n"))}</textarea>
      <div class="sub-h"><b>Tags</b><small class="help">Short labels, separated by commas, e.g. Portable, ICU, 24V battery.</small></div>
      <input type="text" id="tagList" value="${esc(tags.join(", "))}">
      ${other.length ? `<div class="sub-h"><b>Other details</b><small class="help">Kept as they are.</small></div><pre class="raw">${esc(JSON.stringify(Object.fromEntries(other.map((k) => [k, spec[k]])), null, 2))}</pre>` : ""}`;
    const add = (l = "", v = "") => { $("#specRows").insertAdjacentHTML("beforeend", specRow(l, v)); };
    $("#addSpec").addEventListener("click", () => { add(); $("#specRows").lastElementChild.querySelector("input").focus(); });
    $("#addHead").addEventListener("click", () => { $("#specRows").insertAdjacentHTML("beforeend", specHead("")); $("#specRows").lastElementChild.querySelector("input").focus(); S.dirty = true; });
    $("#specRows").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; const r = b.closest(".spec-row"); if (b.dataset.a === "del") r.remove(); if (b.dataset.a === "up" && r.previousElementSibling) r.parentNode.insertBefore(r, r.previousElementSibling); if (b.dataset.a === "down" && r.nextElementSibling) r.parentNode.insertBefore(r.nextElementSibling, r); S.dirty = true; });
    if (!rows.length) add();
  }
  const specRow = (l, v) => `<div class="spec-row"><input type="text" placeholder="e.g. Battery" value="${esc(l)}" aria-label="Specification name"><input type="text" placeholder="e.g. 24V 20Ah lithium-ion" value="${esc(v)}" aria-label="Specification value"><span class="row-btns"><button type="button" data-a="up" title="Move up">${icon("up")}</button><button type="button" data-a="down" title="Move down">${icon("down")}</button><button type="button" data-a="del" title="Remove">${icon("x")}</button></span></div>`;
  const specHead = (t) => `<div class="spec-row spec-head"><input type="text" placeholder="Section heading, e.g. Monitored Parameters" value="${esc(t)}" aria-label="Section heading"><span class="row-btns"><button type="button" data-a="up" title="Move up">${icon("up")}</button><button type="button" data-a="down" title="Move down">${icon("down")}</button><button type="button" data-a="del" title="Remove">${icon("x")}</button></span></div>`;
  function readSpecs(orig) {
    const keep = orig && typeof orig === "object" ? Object.fromEntries(Object.entries(orig).filter(([k]) => !["specs", "features", "tags"].includes(k))) : {};
    let group = null;
    const specs = [];
    $$("#specRows .spec-row").forEach((r) => {
      if (r.classList.contains("spec-head")) { group = $("input", r).value.trim() || null; return; }
      const [a, b] = $$("input", r); const row = { label: a.value.trim(), value: b.value.trim() };
      if (!row.label && !row.value) return;
      specs.push(group ? { group, ...row } : row);
    });
    return {
      ...keep,
      specs,
      features: $("#featList").value.split("\n").map((s) => s.trim()).filter(Boolean),
      tags: $("#tagList").value.split(",").map((s) => s.trim()).filter(Boolean),
    };
  }

  /* ---------- product extras: gallery, applications, certifications ---------- */
  async function productExtras(pid) {
    const [apps, certs, imgs, pa, pc] = await Promise.all([
      lookup("applications"), lookup("certifications"),
      sb.from("product_images").select("*").eq("product_id", pid).order("display_order"),
      sb.from("product_applications").select("application_id").eq("product_id", pid),
      sb.from("product_certifications").select("certification_id").eq("product_id", pid),
    ]);
    const hasA = new Set((pa.data || []).map((r) => r.application_id)), hasC = new Set((pc.data || []).map((r) => r.certification_id));
    const chips = (list, has, name, empty, link) => list.length ? `<div class="chips">${list.map((o) => `<label class="chip"><input type="checkbox" name="${name}" value="${o.id}" ${has.has(o.id) ? "checked" : ""}><span>${esc(o.label)}</span></label>`).join("")}</div>` : `<p class="muted">${empty} <a href="#/${link}/new">Add one →</a></p>`;
    $("#extras").innerHTML = `
      <section class="panel"><div class="panel-h"><h2>Photo gallery <small class="muted" id="galCount"></small></h2><label class="btn ghost sm">${icon("plus")} Add photos<input type="file" id="galUp" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" multiple hidden></label></div>
        <div class="gallery" id="gallery" title="Drop photos here"></div><p class="help pad" id="galHelp">Drop photos here or click <b>Add photos</b> (you can pick several). Drag to reorder. The first photo is the main one on the website. Add alt text so Google and screen readers know what each photo shows.</p></section>
      <section class="panel"><div class="panel-h"><h2>Used in (applications)</h2></div><div class="pad">${chips(apps, hasA, "app", "No applications yet.", "applications")}</div></section>
      <section class="panel"><div class="panel-h"><h2>Certifications</h2></div><div class="pad">${chips(certs, hasC, "cert", "No certifications yet.", "certifications")}</div></section>`;
    let gal = imgs.data || [];
    const paint = () => {
      $("#gallery").innerHTML = gal.length ? gal.map((g, i) => `<figure draggable="true" data-i="${i}"><img src="${esc(g.image_url)}" alt="${esc(g.alt_text || "")}" loading="lazy"><input type="text" placeholder="Alt text (describe the photo)" value="${esc(g.alt_text || "")}" data-alt="${g.id}"${g.alt_text ? "" : ' class="need"'}><button type="button" class="x" data-rm="${g.id}" title="Remove photo">${icon("x")}</button>${i === 0 ? '<span class="prim">Main</span>' : `<button type="button" class="mk" data-main="${g.id}" title="Make this the main photo">Make main</button>`}</figure>`).join("") : `<p class="muted pad">No photos yet.</p>`;
      $("#galCount").textContent = gal.length ? `(${gal.length})` : "";
    };
    paint();
    const pname = () => ($("#f_name")?.value || "").trim();
    const saveOrder = async () => {
      await Promise.all(gal.map((g, i) => sb.from("product_images").update({ display_order: i, is_primary: i === 0 }).eq("id", g.id)));
      gal.forEach((g, i) => { g.display_order = i; g.is_primary = i === 0; });
      // keep the product's main image in step with the first gallery photo
      const first = gal[0]?.image_url || null, main = $("#f_featured_image");
      if (first && main && main.value !== first) { main.value = first || ""; main.dispatchEvent(new Event("change")); await sb.from("products").update({ featured_image: first }).eq("id", pid); }
    };
    const addFiles = async (files) => {
      files = files.filter((f) => IMG_TYPES.test(f.type));
      if (!files.length) return toast("Use JPG, PNG, WebP, GIF or AVIF images.", "err");
      let done = 0, failed = 0; const help = $("#galHelp"), was = help.innerHTML;
      const tick = () => { help.innerHTML = `<span class="spin sm"></span> Uploading ${done + failed} of ${files.length}…`; };
      tick();
      const results = await Promise.all(files.map(async (f, k) => {
        try { const r = await upload(f, "products"); done++; tick(); return { url: r.url, k }; }
        catch (err) { failed++; tick(); toast(`${f.name}: ${friendly(err)}`, "err"); return null; }
      }));
      const rows = results.filter(Boolean).sort((a, b) => a.k - b.k).map((r, j) => ({ product_id: pid, image_url: r.url, alt_text: pname() ? `${pname()} photo ${gal.length + j + 1}` : null, display_order: gal.length + j, is_primary: gal.length + j === 0 }));
      if (rows.length) { const { data, error } = await sb.from("product_images").insert(rows).select("*"); if (error) toast(friendly(error), "err"); else { gal.push(...data); paint(); await saveOrder(); } }
      help.innerHTML = was;
      if (done) toast(`${done} photo${done > 1 ? "s" : ""} added${failed ? `, ${failed} failed` : ""}`);
    };
    $("#galUp").addEventListener("change", async (e) => { const files = [...e.target.files]; e.target.value = ""; await addFiles(files); });
    dropZone($("#gallery"), addFiles);
    $("#gallery").addEventListener("click", async (e) => {
      const mk = e.target.closest("[data-main]");
      if (mk) { const i = gal.findIndex((g) => g.id === mk.dataset.main); const [m] = gal.splice(i, 1); gal.unshift(m); paint(); await saveOrder(); return toast("Main photo changed"); }
      const b = e.target.closest("[data-rm]"); if (!b) return;
      if (!(await confirmBox("Remove this photo?", "It will be removed from the product and the website."))) return;
      const gone = gal.find((g) => g.id === b.dataset.rm);
      const { error } = await sb.from("product_images").delete().eq("id", b.dataset.rm);
      if (error) return toast(friendly(error), "err");
      gal = gal.filter((g) => g.id !== b.dataset.rm); paint(); await saveOrder();
      if (gone && !gal.some((g) => g.image_url === gone.image_url)) await removeStored([gone.image_url]);
      toast("Photo removed");
    });
    $("#gallery").addEventListener("change", async (e) => { const a = e.target.closest("[data-alt]"); if (!a) return; await sb.from("product_images").update({ alt_text: a.value.trim() || null }).eq("id", a.dataset.alt); toast("Alt text saved"); });
    let from = null;
    $("#gallery").addEventListener("dragstart", (e) => { from = +e.target.closest("figure")?.dataset.i; });
    $("#gallery").addEventListener("dragover", (e) => e.preventDefault());
    $("#gallery").addEventListener("drop", async (e) => {
      if (e.dataTransfer?.files?.length) return; // dropped files are handled by the drop zone
      e.preventDefault(); const to = +e.target.closest("figure")?.dataset.i; const f0 = from; from = null; if (f0 == null || isNaN(to) || f0 === to) return;
      const [m] = gal.splice(f0, 1); gal.splice(to, 0, m); paint(); await saveOrder(); paint(); toast("Order saved");
    });
  }
  async function saveProductLinks(pid) {
    const sync = async (table, col, name) => {
      const want = $$(`input[name="${name}"]:checked`).map((i) => i.value);
      const { data } = await sb.from(table).select(col).eq("product_id", pid);
      const have = (data || []).map((r) => r[col]);
      const add = want.filter((x) => !have.includes(x)), rm = have.filter((x) => !want.includes(x));
      if (add.length) { const { error } = await sb.from(table).insert(add.map((x) => ({ product_id: pid, [col]: x }))); if (error) throw error; }
      if (rm.length) { const { error } = await sb.from(table).delete().eq("product_id", pid).in(col, rm); if (error) throw error; }
    };
    await sync("product_applications", "application_id", "app");
    await sync("product_certifications", "certification_id", "cert");
  }

  /* ---------- leads: enquiries + demo requests ---------- */
  const LEAD = {
    enquiries: {
      title: "Enquiries", statuses: [["new", "New"], ["contacted", "Contacted"], ["qualified", "Qualified"], ["converted", "Converted"], ["lost", "Lost"]],
      select: "*, products(name), assignee:profiles!enquiries_assigned_to_fkey(full_name)", search: ["name", "company", "email", "phone", "city", "message"],
      extraFilter: { name: "customer_type", options: [["hospital", "Hospital"], ["distributor", "Distributor"], ["government", "Government"], ["other", "Other"]] },
      cols: ["Name", "Contact", "Product", "Type", "Received", "Status", "Assigned to"],
      csv: ["created_at", "name", "company", "email", "phone", "city", "state", "country", "customer_type", "source", "status", "message"],
    },
    demo_requests: {
      title: "Demo Requests", statuses: [["pending", "Pending"], ["scheduled", "Scheduled"], ["completed", "Completed"], ["cancelled", "Cancelled"]],
      select: "*, products(name)", search: ["name", "company", "email", "phone", "location"],
      cols: ["Name", "Contact", "Product", "Preferred date", "Received", "Status"],
      csv: ["created_at", "name", "company", "email", "phone", "location", "preferred_date", "status"],
    },
  };
  async function leads(key) {
    const L = LEAD[key], main = $("#main"), isEnq = key === "enquiries";
    const st = JSON.parse(sessionStorage.getItem("list:" + key) || "null") || { q: "", page: 0, status: "", type: "", from: "", to: "" };
    const pre = sessionStorage.getItem("enqStatus"); if (isEnq && pre) { st.status = pre; st.page = 0; sessionStorage.removeItem("enqStatus"); }
    if (isEnq) await lookup("profiles");
    const counts = await Promise.all(L.statuses.map(([s]) => sb.from(key).select("id", { count: "exact", head: true }).eq("status", s)));
    main.innerHTML = `
      <header class="ph"><div><h1>${L.title}</h1><p class="muted" id="lcount"> </p></div><div class="row"><button class="btn ghost" id="refresh">${icon("refresh")} Refresh</button><button class="btn ghost" id="csv">${icon("download")} Export CSV</button></div></header>
      <div class="tabs" role="tablist"><button data-s="" class="${!st.status ? "on" : ""}">All</button>${L.statuses.map(([s, l], i) => `<button data-s="${s}" class="${st.status === s ? "on" : ""}">${l}<b>${counts[i].count || 0}</b></button>`).join("")}</div>
      <div class="toolbar"><label class="search">${icon("search")}<input type="search" id="q" placeholder="Search name, company, phone, email…" value="${esc(st.q)}"></label>
        ${L.extraFilter ? `<select id="typeF" aria-label="Customer type"><option value="">All customer types</option>${L.extraFilter.options.map(([v, l]) => `<option value="${v}" ${st.type === v ? "selected" : ""}>${l}</option>`).join("")}</select>` : ""}
        <label class="date">From <input type="date" id="fromF" value="${esc(st.from)}"></label><label class="date">To <input type="date" id="toF" value="${esc(st.to)}"></label></div>
      <div class="tablewrap"><table class="tbl leads"><thead><tr>${L.cols.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody id="rows"><tr><td colspan="${L.cols.length}" class="loading"><span class="spin"></span>Loading…</td></tr></tbody></table></div>
      <div class="pager" id="pager"></div>`;
    const save = () => sessionStorage.setItem("list:" + key, JSON.stringify(st));
    const build = (sel, opt) => {
      let q = sb.from(key).select(sel, opt).order("created_at", { ascending: false });
      if (st.status) q = q.eq("status", st.status);
      if (st.type) q = q.eq("customer_type", st.type);
      if (st.from) q = q.gte("created_at", st.from);
      if (st.to) q = q.lt("created_at", new Date(new Date(st.to).getTime() + 864e5).toISOString().slice(0, 10));
      if (st.q) q = q.or(L.search.map((c) => `${c}.ilike.%${st.q.replace(/[%,()]/g, " ")}%`).join(","));
      return q;
    };
    let rows = [];
    async function load() {
      const { data, error, count } = await build(L.select, { count: "exact" }).range(st.page * PAGE, st.page * PAGE + PAGE - 1);
      if (error) { $("#rows").innerHTML = `<tr><td colspan="${L.cols.length}" class="err">${esc(friendly(error))}</td></tr>`; return; }
      rows = data; $("#lcount").textContent = `${count} ${count === 1 ? "result" : "results"}`;
      const statusSel = (r) => `<select class="st s-${esc(r.status)}" data-st="${r.id}" aria-label="Status">${L.statuses.map(([s, l]) => `<option value="${s}" ${r.status === s ? "selected" : ""}>${l}</option>`).join("")}</select>`;
      $("#rows").innerHTML = data.length ? data.map((r) => `<tr tabindex="0" data-id="${r.id}" class="${(r.status === "new" || r.status === "pending") ? "unread" : ""}">
          <td><b>${esc(r.name)}</b><small>${esc(r.company || "")}</small></td>
          <td>${r.phone ? `<a href="tel:${esc(r.phone)}">${esc(r.phone)}</a>` : ""}<small>${esc(r.email || "")}</small></td>
          <td>${esc(r.products?.name || "—")}</td>
          ${isEnq ? `<td>${r.customer_type ? `<span class="badge">${esc(human(r.customer_type))}</span>` : "—"}<small>${esc(r.source || "")}</small></td>` : `<td>${r.preferred_date ? fmtDate(r.preferred_date) : "—"}<small>${esc(r.location || "")}</small></td>`}
          <td class="muted" title="${esc(fmtDT(r.created_at))}">${ago(r.created_at)}</td>
          <td>${statusSel(r)}</td>
          ${isEnq ? `<td><select class="as" data-as="${r.id}" aria-label="Assigned to"><option value="">Unassigned</option>${S.fk.profiles.map((p) => `<option value="${p.id}" ${r.assigned_to === p.id ? "selected" : ""}>${esc(p.label)}</option>`).join("")}</select></td>` : ""}</tr>`).join("")
        : `<tr><td colspan="${L.cols.length}"><div class="empty sm"><p>No ${L.title.toLowerCase()} match.</p></div></td></tr>`;
      $$("#rows tr[data-id]").forEach((tr) => { const open = (e) => { if (e.target.closest("select,a")) return; drawer(key, rows.find((x) => x.id === tr.dataset.id)); }; tr.addEventListener("click", open); tr.addEventListener("keydown", (e) => e.key === "Enter" && open(e)); });
      pager(count, st, load, save);
      const auto = sessionStorage.getItem("enqOpen"); if (isEnq && auto) { sessionStorage.removeItem("enqOpen"); const r = rows.find((x) => x.id === auto); if (r) drawer(key, r); }
    }
    $("#rows").addEventListener("change", async (e) => {
      const s = e.target.closest("[data-st]"), a = e.target.closest("[data-as]");
      if (s) { const { error } = await sb.from(key).update({ status: s.value }).eq("id", s.dataset.st); if (error) return toast(friendly(error), "err"); s.className = "st s-" + s.value; s.closest("tr").classList.remove("unread"); toast("Status updated"); refreshBadges(); }
      if (a) { const { error } = await sb.from(key).update({ assigned_to: a.value || null }).eq("id", a.dataset.as); if (error) return toast(friendly(error), "err"); toast(a.value ? "Assigned" : "Unassigned"); }
    });
    $$(".tabs button").forEach((b) => b.addEventListener("click", () => { st.status = b.dataset.s; st.page = 0; save(); $$(".tabs button").forEach((x) => x.classList.toggle("on", x === b)); load(); }));
    $("#q").addEventListener("input", debounce((e) => { st.q = e.target.value.trim(); st.page = 0; save(); load(); }));
    $("#typeF")?.addEventListener("change", (e) => { st.type = e.target.value; st.page = 0; save(); load(); });
    $("#fromF").addEventListener("change", (e) => { st.from = e.target.value; st.page = 0; save(); load(); });
    $("#toF").addEventListener("change", (e) => { st.to = e.target.value; st.page = 0; save(); load(); });
    $("#refresh").addEventListener("click", () => { load(); refreshBadges(); });
    $("#csv").addEventListener("click", async () => {
      const { data, error } = await build(L.select).limit(5000);
      if (error) return toast(friendly(error), "err");
      const cols = [...L.csv, "product"]; const cellv = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const csv = [cols.join(","), ...data.map((r) => cols.map((c) => cellv(c === "product" ? r.products?.name : r[c])).join(","))].join("\r\n");
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" })); a.download = `pulse-${key}-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(a.href);
      toast(`Exported ${data.length} rows`);
    });
    await load();
  }
  function drawer(key, r) {
    const d = $("#drawer"), isEnq = key === "enquiries";
    const line = (l, v) => v ? `<div class="kv"><span>${l}</span><b>${esc(v)}</b></div>` : "";
    const wa = r.phone ? `https://wa.me/${waNum(r.phone)}?text=${encodeURIComponent(`Hi ${r.name}, this is Pulse. Thank you for your ${isEnq ? "enquiry" : "demo request"}${r.products?.name ? " about " + r.products.name : ""}.`)}` : "";
    $("#dBody").innerHTML = `
      <h2>${esc(r.name)}</h2><p class="muted">${esc(r.company || "")}</p>
      <div class="act">${r.phone ? `<a class="btn sm" href="${wa}" target="_blank" rel="noopener">${icon("wa")} WhatsApp</a><a class="btn ghost sm" href="tel:${esc(r.phone)}">${icon("phone")} Call</a>` : ""}${r.email ? `<a class="btn ghost sm" href="mailto:${esc(r.email)}">${icon("mail")} Email</a>` : ""}</div>
      ${r.message ? `<div class="msg">${esc(r.message)}</div>` : ""}
      ${line("Product", r.products?.name)}${line("Phone", r.phone)}${line("Email", r.email)}${line("Customer type", r.customer_type && human(r.customer_type))}${line("Source", r.source)}
      ${line("City", [r.city, r.state, r.country].filter(Boolean).join(", "))}${line("Location", r.location)}${line("Preferred date", r.preferred_date && fmtDate(r.preferred_date))}
      ${line("Assigned to", r.assignee?.full_name)}${line("Received", fmtDT(r.created_at))}
      <button class="btn ghost danger sm" id="dDel">${icon("trash")} Delete</button>`;
    d.showModal();
    $("#dDel").onclick = async () => {
      if (!(await confirmBox("Delete this lead?", "It will be removed permanently."))) return;
      const { error } = await sb.from(key).delete().eq("id", r.id);
      if (error) return toast(friendly(error), "err");
      d.close(); toast("Deleted"); route(); refreshBadges();
    };
  }
  $("#dClose").addEventListener("click", () => $("#drawer").close());
  $("#drawer").addEventListener("click", (e) => { if (e.target.id === "drawer") $("#drawer").close(); });

  /* ---------- job applications (career form) ---------- */
  const JOB_STATUS = [["new", "New"], ["reviewing", "Reviewing"], ["shortlisted", "Shortlisted"], ["interview", "Interview"], ["hired", "Hired"], ["rejected", "Not selected"]];
  async function openCv(r) {
    if (!r.resume_path) return toast("No CV was uploaded with this application.", "err");
    const { data, error } = await sb.storage.from("resumes").createSignedUrl(r.resume_path, 600, { download: r.resume_file_name || true });
    if (error) return toast(friendly(error), "err");
    window.open(data.signedUrl, "_blank", "noopener");
  }
  async function jobs() {
    const key = "job_applications", main = $("#main");
    const st = JSON.parse(sessionStorage.getItem("list:" + key) || "null") || { q: "", page: 0, status: "", role: "", from: "", to: "" };
    const [counts, roles] = await Promise.all([
      Promise.all(JOB_STATUS.map(([v]) => sb.from(key).select("id", { count: "exact", head: true }).eq("status", v))),
      sb.from(key).select("applied_role").not("applied_role", "is", null).limit(2000),
    ]);
    const roleList = [...new Set((roles.data || []).map((r) => r.applied_role).filter(Boolean))].sort();
    main.innerHTML = `
      <header class="ph"><div><h1>Job Applications</h1><p class="muted" id="lcount"> </p></div><div class="row"><button class="btn ghost" id="refresh">${icon("refresh")} Refresh</button><button class="btn ghost" id="csv">${icon("download")} Export CSV</button></div></header>
      <div class="tabs" role="tablist"><button data-s="" class="${!st.status ? "on" : ""}">All</button>${JOB_STATUS.map(([v, l], i) => `<button data-s="${v}" class="${st.status === v ? "on" : ""}">${l}<b>${counts[i].count || 0}</b></button>`).join("")}</div>
      <div class="toolbar"><label class="search">${icon("search")}<input type="search" id="q" placeholder="Search name, phone, email, role…" value="${esc(st.q)}"></label>
        <select id="roleF" aria-label="Role"><option value="">All roles</option>${roleList.map((v) => `<option ${st.role === v ? "selected" : ""}>${esc(v)}</option>`).join("")}</select>
        <label class="date">From <input type="date" id="fromF" value="${esc(st.from)}"></label><label class="date">To <input type="date" id="toF" value="${esc(st.to)}"></label></div>
      <div class="tablewrap"><table class="tbl leads"><thead><tr><th>Applicant</th><th>Contact</th><th>Applied for</th><th>Experience</th><th>Received</th><th>CV</th><th>Status</th></tr></thead><tbody id="rows"><tr><td colspan="7" class="loading"><span class="spin"></span>Loading…</td></tr></tbody></table></div>
      <div class="pager" id="pager"></div>`;
    const save = () => sessionStorage.setItem("list:" + key, JSON.stringify(st));
    const build = (opt) => {
      let q = sb.from(key).select("*", opt).order("created_at", { ascending: false });
      if (st.status) q = q.eq("status", st.status);
      if (st.role) q = q.eq("applied_role", st.role);
      if (st.from) q = q.gte("created_at", st.from);
      if (st.to) q = q.lt("created_at", new Date(new Date(st.to).getTime() + 864e5).toISOString().slice(0, 10));
      if (st.q) q = q.or(["name", "email", "phone", "applied_role", "job_title"].map((c) => `${c}.ilike.%${st.q.replace(/[%,()]/g, " ")}%`).join(","));
      return q;
    };
    let rows = [];
    const statusSel = (r) => `<select class="st s-${esc(r.status)}" data-st="${r.id}" aria-label="Status">${JOB_STATUS.map(([v, l]) => `<option value="${v}" ${r.status === v ? "selected" : ""}>${l}</option>`).join("")}</select>`;
    async function load() {
      const { data, error, count } = await build({ count: "exact" }).range(st.page * PAGE, st.page * PAGE + PAGE - 1);
      if (error) { $("#rows").innerHTML = `<tr><td colspan="7" class="err">${esc(friendly(error))}</td></tr>`; return; }
      rows = data; $("#lcount").textContent = `${count} ${count === 1 ? "application" : "applications"}`;
      $("#rows").innerHTML = data.length ? data.map((r) => `<tr tabindex="0" data-id="${r.id}" class="${r.status === "new" ? "unread" : ""}">
          <td><b>${esc(r.name)}</b><small>${esc(r.job_title || "")}</small></td>
          <td>${r.phone ? `<a href="tel:${esc(r.phone)}">${esc(r.phone)}</a>` : ""}<small>${esc(r.email || "")}</small></td>
          <td>${esc(r.applied_role || "—")}</td>
          <td>${esc(r.years_experience ? r.years_experience + (/^\d+(\.\d+)?$/.test(r.years_experience.trim()) ? " yrs" : "") : "—")}</td>
          <td class="muted" title="${esc(fmtDT(r.created_at))}">${ago(r.created_at)}</td>
          <td>${r.resume_path ? `<button type="button" class="btn ghost sm" data-cv="${r.id}">${icon("download")} CV</button>` : '<span class="muted">—</span>'}</td>
          <td>${statusSel(r)}</td></tr>`).join("")
        : `<tr><td colspan="7"><div class="empty sm"><p>${st.q || st.status || st.role || st.from || st.to ? "No applications match." : "No applications yet. They appear here as soon as someone applies on the Careers form."}</p></div></td></tr>`;
      $$("#rows tr[data-id]").forEach((tr) => { const open = (e) => { if (e.target.closest("select,a,button")) return; jobDrawer(rows.find((x) => x.id === tr.dataset.id), load); }; tr.addEventListener("click", open); tr.addEventListener("keydown", (e) => e.key === "Enter" && open(e)); });
      pager(count, st, load, save);
    }
    $("#rows").addEventListener("click", (e) => { const b = e.target.closest("[data-cv]"); if (b) openCv(rows.find((x) => x.id === b.dataset.cv)); });
    $("#rows").addEventListener("change", async (e) => {
      const s = e.target.closest("[data-st]"); if (!s) return;
      const { error } = await sb.from(key).update({ status: s.value, reviewed_by: S.me.id }).eq("id", s.dataset.st);
      if (error) return toast(friendly(error), "err");
      const row = rows.find((x) => x.id === s.dataset.st); if (row) row.status = s.value;
      s.className = "st s-" + s.value; s.closest("tr").classList.remove("unread"); toast("Status updated"); refreshBadges();
    });
    $$(".tabs button").forEach((b) => b.addEventListener("click", () => { st.status = b.dataset.s; st.page = 0; save(); $$(".tabs button").forEach((x) => x.classList.toggle("on", x === b)); load(); }));
    $("#q").addEventListener("input", debounce((e) => { st.q = e.target.value.trim(); st.page = 0; save(); load(); }));
    $("#roleF").addEventListener("change", (e) => { st.role = e.target.value; st.page = 0; save(); load(); });
    $("#fromF").addEventListener("change", (e) => { st.from = e.target.value; st.page = 0; save(); load(); });
    $("#toF").addEventListener("change", (e) => { st.to = e.target.value; st.page = 0; save(); load(); });
    $("#refresh").addEventListener("click", () => { load(); refreshBadges(); });
    $("#csv").addEventListener("click", async () => {
      const { data, error } = await build().limit(5000);
      if (error) return toast(friendly(error), "err");
      const cols = ["created_at", "name", "phone", "email", "applied_role", "job_title", "years_experience", "status", "message", "notes", "resume_file_name"];
      const cellv = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const csv = [cols.join(","), ...data.map((r) => cols.map((c) => cellv(r[c])).join(","))].join("\r\n");
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" })); a.download = `pulse-job-applications-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(a.href);
      toast(`Exported ${data.length} rows`);
    });
    await load();
  }
  function jobDrawer(r, reload) {
    const d = $("#drawer");
    const line = (l, v) => v ? `<div class="kv"><span>${l}</span><b>${esc(v)}</b></div>` : "";
    const wa = r.phone ? `https://wa.me/${waNum(r.phone)}?text=${encodeURIComponent(`Hi ${r.name}, this is Pulse. Thank you for applying${r.applied_role ? " for the " + r.applied_role + " role" : ""}.`)}` : "";
    $("#dBody").innerHTML = `
      <h2>${esc(r.name)}</h2><p class="muted">${esc([r.job_title, r.years_experience && r.years_experience + (/^\d+(\.\d+)?$/.test(r.years_experience.trim()) ? " yrs experience" : "")].filter(Boolean).join(" · "))}</p>
      <div class="act">${r.resume_path ? `<button class="btn sm" id="dCv" type="button">${icon("download")} Open CV</button>` : ""}${r.phone ? `<a class="btn ghost sm" href="${wa}" target="_blank" rel="noopener">${icon("wa")} WhatsApp</a><a class="btn ghost sm" href="tel:${esc(r.phone)}">${icon("phone")} Call</a>` : ""}${r.email ? `<a class="btn ghost sm" href="mailto:${esc(r.email)}?subject=${encodeURIComponent("Your application at Pulse" + (r.applied_role ? " – " + r.applied_role : ""))}">${icon("mail")} Email</a>` : ""}</div>
      ${r.message ? `<div class="msg">${esc(r.message)}</div>` : ""}
      ${line("Applied for", r.applied_role)}${line("Current role / skills", r.job_title)}${line("Experience", r.years_experience)}${line("Phone", r.phone)}${line("Email", r.email)}
      ${line("CV file", r.resume_path ? r.resume_file_name || "Uploaded" : "Not uploaded (check the Google Sheet)")}${line("Received", fmtDT(r.created_at))}${line("Applied from", r.source_page)}
      <div class="field" style="margin-top:14px"><label for="jStatus">Status</label><select id="jStatus">${JOB_STATUS.map(([v, l]) => `<option value="${v}" ${r.status === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>
      <div class="field" style="margin-top:12px"><label for="jNotes">Internal notes</label><textarea id="jNotes" rows="4" placeholder="Interview feedback, salary expectation, next step… (only admins see this)">${esc(r.notes || "")}</textarea></div>
      <div class="row" style="margin-top:12px"><button class="btn sm" id="jSave" type="button">Save</button></div>
      <button class="btn ghost danger sm" id="dDel">${icon("trash")} Delete application</button>`;
    d.showModal();
    $("#dCv")?.addEventListener("click", () => openCv(r));
    $("#jSave").onclick = async () => {
      const upd = { status: $("#jStatus").value, notes: $("#jNotes").value.trim() || null, reviewed_by: S.me.id };
      const { error } = await sb.from("job_applications").update(upd).eq("id", r.id);
      if (error) return toast(friendly(error), "err");
      Object.assign(r, upd); toast("Saved"); reload(); refreshBadges();
    };
    $("#dDel").onclick = async () => {
      if (!(await confirmBox("Delete this application?", "The application and its CV will be removed permanently."))) return;
      const { error } = await sb.from("job_applications").delete().eq("id", r.id);
      if (error) return toast(friendly(error), "err");
      if (r.resume_path) await sb.storage.from("resumes").remove([r.resume_path]).catch(() => null);
      d.close(); toast("Deleted"); reload(); refreshBadges();
    };
  }

  /* ---------- publish to website ---------- */
  const pubApi = async (body) => {
    const { data, error } = await sb.functions.invoke("publish-site", { body });
    if (error) { let j = null; try { j = await error.context.json(); } catch (_) {} const e = new Error(j?.error || error.message); e.setup = !!j?.setup; throw e; }
    return data;
  };
  async function publish() {
    const main = $("#main");
    main.innerHTML = `
      <header class="ph"><div><h1>Publish to website</h1><p class="muted">Copies your admin changes onto pulseio.in. The site updates about 1–2 minutes after you click.</p></div>
        <div class="row"><button class="btn ghost" id="pubPreview" type="button">Check only</button><button class="btn" id="pubNow" type="button">${icon("up")} Publish now</button></div></header>
      <div id="pubSetup"></div>
      <div class="grid2">
        <section class="panel"><div class="panel-h"><h2>Edited since the last publish</h2></div><div id="pending" class="pad"><span class="spin sm"></span> Checking…</div></section>
        <section class="panel"><div class="panel-h"><h2>What publishing updates</h2></div><div class="pad">
          <p><b>Live now</b></p><ul class="ticks">
            <li>Page titles, descriptions and share images (<a href="#/website_pages">Page SEO</a>)</li>
            <li>Product pages: summary, tags, brochure, photo gallery, spec table rows and key features (<a href="#/products">Products</a>)</li>
            <li>Product SEO title and description</li>
            <li>FAQ answers used by site search and the chatbot (<a href="#/faqs">FAQs</a>, only ones with a page link)</li>
            <li><b>New products</b>: tick <b>Create a page on the website</b> on an Active product, and Publish makes its page and adds it to the category page, menu, site search and sitemap</li></ul>
          <p class="muted"><b>Not yet</b>: long descriptions, adding or renaming spec sections, and home-page banners, stats, gallery, certificates and investors. Changes to those are saved here but not yet shown on the website. If something can't be applied, the publish result below says why.</p>
        </div></section>
      </div>
      <section class="panel"><div class="panel-h"><h2>Recent publishes</h2><button class="btn ghost sm" id="pubRefresh" type="button">${icon("refresh")} Refresh</button></div>
        <div class="tablewrap flat"><table class="tbl"><thead><tr><th>Started</th><th>By</th><th>Result</th><th></th></tr></thead><tbody id="runs"><tr><td colspan="4" class="loading"><span class="spin"></span>Loading…</td></tr></tbody></table></div></section>`;
    const setupBox = () => { $("#pubSetup").innerHTML = `<section class="panel warnbox"><div class="pad"><h2>One-time setup: connect publishing to GitHub</h2><ol class="steps">
      <li>On GitHub, open <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">Settings → Developer settings → Fine-grained tokens → Generate new token</a>.</li>
      <li>Name it <b>pulse-admin-publish</b>, set an expiry (e.g. 1 year), and under <b>Repository access</b> choose <b>Only select repositories → pulse-website</b>.</li>
      <li>Under <b>Permissions → Repository permissions</b>, set <b>Actions</b> to <b>Read and write</b>. Leave everything else as is. Generate and copy the token.</li>
      <li>In Supabase, open <a href="https://supabase.com/dashboard/project/vyknmwrcvfnpbcrjugik/functions/secrets" target="_blank" rel="noopener">Edge Functions → Secrets</a>, add a secret named <b>GITHUB_PUBLISH_TOKEN</b> and paste the token. Save.</li>
      <li>Come back here and click <b>Check only</b> to test.</li></ol></div></section>`; };
    let lastDone = null, timer = null;
    const label = (r) => r.status !== "completed" ? `<span class="badge s-pending"><span class="spin sm"></span>${r.status === "queued" ? "Starting" : "Publishing"}</span>`
      : r.conclusion === "success" ? `<span class="badge s-active">${/preview/i.test(r.title || "") ? "Checked" : "Done"}</span>` : `<span class="badge s-lost">${esc(human(r.conclusion || "failed"))}</span>`;
    async function loadRuns() {
      try {
        const { runs } = await pubApi({ action: "status" });
        $("#pubSetup").innerHTML = "";
        $("#runs").innerHTML = runs.length ? runs.map((r) => `<tr><td>${ago(r.created_at)}<small class="muted"> · ${new Date(r.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</small></td><td>${esc((r.title || "").replace(/^Publish by /, "").replace(/ \(preview only\)$/, "") || "—")}${/preview/i.test(r.title || "") ? ' <small class="muted">(check only)</small>' : ""}</td><td>${label(r)}${r.result ? `<small class="runres">${esc(r.result).replace(/\n/g, "<br>")}</small>` : ""}${r.notes ? `<details class="runnotes"><summary>Notes (${r.notes.split("\n").length})</summary><small>${esc(r.notes).replace(/\n/g, "<br>")}</small></details>` : ""}</td><td><a href="${esc(r.url)}" target="_blank" rel="noopener">Details</a></td></tr>`).join("")
          : `<tr><td colspan="4" class="muted pad">Nothing published from here yet.</td></tr>`;
        const real = runs.find((r) => r.status === "completed" && r.conclusion === "success" && !/preview/i.test(r.title || ""));
        lastDone = real ? real.created_at : null;
        clearTimeout(timer);
        if (runs.some((r) => r.status !== "completed") && location.hash === "#/publish") timer = setTimeout(() => { loadRuns(); }, 5000);
        return runs;
      } catch (e) {
        $("#runs").innerHTML = `<tr><td colspan="4" class="err">${esc(e.message)}</td></tr>`;
        if (e.setup) setupBox();
        return [];
      }
    }
    async function loadPending() {
      const since = lastDone || "1970-01-01";
      const [p, w, f] = await Promise.all([
        sb.from("products").select("id,name,updated_at").gt("updated_at", since).order("updated_at", { ascending: false }).limit(50),
        sb.from("website_pages").select("id,page_name,updated_at").gt("updated_at", since).order("updated_at", { ascending: false }).limit(50),
        sb.from("faqs").select("id,question,created_at").gt("created_at", since).order("created_at", { ascending: false }).limit(50),
      ]);
      const items = [...(p.data || []).map((r) => ["products", r.id, r.name, r.updated_at, "Product"]), ...(w.data || []).map((r) => ["website_pages", r.id, r.page_name, r.updated_at, "Page SEO"]), ...(f.data || []).map((r) => ["faqs", r.id, r.question, r.created_at, "New FAQ"])]
        .sort((a, b) => b[3].localeCompare(a[3]));
      $("#pending").innerHTML = !lastDone ? `<p class="muted">Not published from here yet. Your first publish will check every page and product.</p>`
        : items.length ? `<ul class="feed">${items.slice(0, 12).map(([t, id, n, d, k]) => `<li><a href="#/${t}/${id}"><div><b>${esc(n)}</b><small>${k}</small></div><div class="r"><small>${ago(d)}</small></div></a></li>`).join("")}</ul>${items.length > 12 ? `<p class="muted">…and ${items.length - 12} more</p>` : ""}`
        : `<p class="muted">Nothing edited since the last publish. The website is up to date.</p>`;
    }
    const start = async (dry) => {
      const b = dry ? $("#pubPreview") : $("#pubNow");
      if (!dry && !(await confirmBox("Publish to the website?", "Your saved admin changes will go live on pulseio.in in about 1–2 minutes.", "Publish"))) return;
      b.disabled = true;
      try { await pubApi({ action: "publish", dry_run: dry }); toast(dry ? "Checking… this takes about 30 seconds" : "Publishing started"); setTimeout(loadRuns, 3000); }
      catch (e) { toast(e.message, "err"); if (e.setup) setupBox(); }
      finally { b.disabled = false; }
    };
    $("#pubNow").onclick = () => start(false);
    $("#pubPreview").onclick = () => start(true);
    $("#pubRefresh").onclick = () => loadRuns().then(loadPending);
    await loadRuns(); await loadPending();
  }

  /* ---------- team ---------- */
  const teamApi = async (body) => {
    const { data, error } = await sb.functions.invoke("team-admin", { body });
    if (error) {
      let msg = error.message;
      try { const j = await error.context.json(); if (j?.error) msg = j.error; } catch (_) {}
      throw new Error(msg);
    }
    return data;
  };
  const loginText = (email, pw) => `Pulse Admin login\nLink: ${location.origin}/\nEmail: ${email}\nTemporary password: ${pw}\nPlease change it after you sign in (Team & Access → Your password).`;
  function showLogin(title, email, pw) {
    const d = $("#drawer");
    $("#dBody").innerHTML = `<h2>${esc(title)}</h2>
      <p class="muted">Share these details with them privately. The password is shown only once.</p>
      <div class="msg" id="loginBox">${esc(loginText(email, pw))}</div>
      <div class="act"><button class="btn" id="cpLogin" type="button">Copy login details</button>
      <a class="btn ghost" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(loginText(email, pw))}">${icon("wa")} Send on WhatsApp</a></div>`;
    $("#cpLogin").onclick = async () => { try { await navigator.clipboard.writeText(loginText(email, pw)); toast("Copied"); } catch (_) { toast("Select the text and copy it", "err"); } };
    if (!d.open) d.showModal();
  }
  function addMemberForm(onDone) {
    const d = $("#drawer");
    $("#dBody").innerHTML = `<h2>Add team member</h2>
      <p class="muted">Creates their login straight away. No email is sent.</p>
      <form id="addForm" class="stack">
        <div class="field"><label for="tmName">Full name</label><input id="tmName" autocomplete="off" placeholder="e.g. Yogesh Kumar"></div>
        <div class="field"><label for="tmEmail">Email <i class="req">*</i></label><input id="tmEmail" type="email" required autocomplete="off" placeholder="name@pulseio.in"></div>
        <label class="switch"><input type="checkbox" id="tmAdmin" checked><span></span>Give admin access now</label>
        <p class="err" id="tmErr" role="alert"></p>
        <button class="btn block" id="tmBtn" type="submit">Create login</button>
      </form>`;
    d.showModal(); $("#tmName").focus();
    $("#addForm").onsubmit = async (e) => {
      e.preventDefault(); const btn = $("#tmBtn"); btn.disabled = true; btn.textContent = "Creating…"; $("#tmErr").textContent = "";
      try {
        const r = await teamApi({ action: "create", email: $("#tmEmail").value, full_name: $("#tmName").value, is_admin: $("#tmAdmin").checked });
        dropCache("profiles"); showLogin("Login created", r.email, r.password); onDone();
      } catch (err) { $("#tmErr").textContent = err.message; btn.disabled = false; btn.textContent = "Create login"; }
    };
  }
  async function team() {
    const main = $("#main");
    const [{ data, error }, emails] = await Promise.all([
      sb.from("profiles").select("*").order("created_at"),
      teamApi({ action: "list" }).then((r) => r.users).catch(() => null),
    ]);
    if (error) throw error;
    const em = Object.fromEntries((emails || []).map((u) => [u.id, u]));
    main.innerHTML = `
      <header class="ph"><div><h1>Team & Access</h1><p class="muted">Only people with admin access can sign in to this panel.</p></div>
        <button class="btn" id="addMember" type="button">${icon("plus")} Add team member</button></header>
      ${emails ? "" : `<p class="note">Couldn't load email addresses right now. You can still change names and access.</p>`}
      <div class="tablewrap"><table class="tbl"><thead><tr><th>Name</th><th>Email</th><th>Admin access</th><th>Last sign-in</th><th></th></tr></thead><tbody>
      ${data.map((p) => { const me = p.id === S.me.id, u = em[p.id] || {}; return `<tr>
        <td><input class="inline" data-name="${p.id}" value="${esc(p.full_name || "")}" placeholder="Add a name" aria-label="Name">${me ? "<small>You</small>" : ""}</td>
        <td class="muted">${esc(u.email || (me ? S.me.email : "—"))}</td>
        <td><label class="switch"><input type="checkbox" data-admin="${p.id}" ${p.is_admin ? "checked" : ""} ${me ? 'disabled title="You can\'t remove your own access"' : ""}><span></span>${p.is_admin ? "Admin" : "No access"}</label></td>
        <td class="muted">${u.last_sign_in_at ? ago(u.last_sign_in_at) : "Never"}</td>
        <td>${me ? "" : `<div class="row-btns"><button type="button" data-reset="${p.id}" title="Give a new temporary password" aria-label="New password">${icon("shield")}</button><button type="button" data-del="${p.id}" title="Delete login" aria-label="Delete login">${icon("trash")}</button></div>`}</td></tr>`; }).join("")}
      </tbody></table></div>
      <section class="panel"><div class="panel-h"><h2>Your password</h2></div>
        <form id="myPw" class="frm"><div class="grid">
          <div class="field"><label for="np1">New password</label><input id="np1" type="password" minlength="10" autocomplete="new-password" required></div>
          <div class="field"><label for="np2">Type it again</label><input id="np2" type="password" minlength="10" autocomplete="new-password" required></div>
        </div><div class="row end" style="padding:0 20px 20px"><button class="btn" type="submit">Change my password</button></div></form></section>`;
    const reload = () => team();
    $("#addMember").onclick = () => addMemberForm(reload);
    const tw = $(".tablewrap", main);
    tw.addEventListener("change", async (e) => {
      const a = e.target.closest("[data-admin]"), n = e.target.closest("[data-name]");
      if (a) { const { error } = await sb.from("profiles").update({ is_admin: a.checked }).eq("id", a.dataset.admin); if (error) { a.checked = !a.checked; return toast(friendly(error), "err"); } a.nextElementSibling.nextSibling.textContent = a.checked ? "Admin" : "No access"; toast(a.checked ? "Access given" : "Access removed"); }
      if (n) { const { error } = await sb.from("profiles").update({ full_name: n.value.trim() || null }).eq("id", n.dataset.name); if (error) return toast(friendly(error), "err"); dropCache("profiles"); toast("Name saved"); }
    });
    tw.addEventListener("click", async (e) => {
      const r = e.target.closest("[data-reset]"), x = e.target.closest("[data-del]");
      const id = (r || x)?.dataset.reset || (r || x)?.dataset.del; if (!id) return;
      const who = (data.find((p) => p.id === id)?.full_name) || em[id]?.email || "this person";
      try {
        if (r) {
          if (!(await confirmBox("Give a new password?", `${who}'s old password will stop working. You'll get a new temporary one to share with them.`, "New password"))) return;
          const res = await teamApi({ action: "reset_password", user_id: id }); showLogin("New password ready", em[id]?.email || who, res.password);
        } else {
          if (!(await confirmBox("Delete this login?", `${who} won't be able to sign in any more. Enquiries assigned to them stay, just unassigned.`))) return;
          await teamApi({ action: "delete", user_id: id }); dropCache("profiles"); toast("Login deleted"); reload();
        }
      } catch (err) { toast(err.message, "err"); }
    });
    $("#myPw").onsubmit = async (e) => {
      e.preventDefault(); const p1 = $("#np1").value, p2 = $("#np2").value;
      if (p1 !== p2) return toast("The two passwords don't match", "err");
      const { error } = await sb.auth.updateUser({ password: p1 });
      if (error) return toast(friendly(error), "err");
      e.target.reset(); toast("Password changed");
    };
  }

  boot();
})();
