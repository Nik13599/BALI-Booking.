import { createClient } from "npm:@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@2.4.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-bali-admin-token",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

function reply(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: cors }); }
function normPhone(v: unknown) { const digits = String(v ?? "").replace(/\D/g, ""); return digits ? `+${digits}` : ""; }
async function sha256(text: string) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join(""); }
function newToken() { const a = new Uint8Array(32); crypto.getRandomValues(a); return btoa(String.fromCharCode(...a)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", ""); }
function cleanText(v: unknown, n = 4000) { return String(v ?? "").trim().slice(0, n); }

async function requireAdmin(req: Request) {
  const raw = req.headers.get("x-bali-admin-token") || "";
  if (!raw) throw new Error("ADMIN_UNAUTHORIZED");
  const tokenHash = await sha256(raw);
  const { data, error } = await db.from("bb_admin_devices").select("id,label").eq("token_hash", tokenHash).eq("active", true).maybeSingle();
  if (error || !data) throw new Error("ADMIN_UNAUTHORIZED");
  await db.from("bb_admin_devices").update({ last_seen_at: new Date().toISOString() }).eq("id", data.id);
  return data;
}

async function requireGuest(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const raw = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!raw) throw new Error("GUEST_UNAUTHORIZED");
  const tokenHash = await sha256(raw);
  const { data: session, error } = await db.from("bb_sessions").select("id,guest_user_id,expires_at").eq("token_hash", tokenHash).eq("session_type", "guest").maybeSingle();
  if (error || !session || new Date(session.expires_at).getTime() <= Date.now()) throw new Error("GUEST_UNAUTHORIZED");
  const { data: user } = await db.from("bb_guest_users").select("id,client_id,phone,active").eq("id", session.guest_user_id).maybeSingle();
  if (!user?.active) throw new Error("GUEST_UNAUTHORIZED");
  await db.from("bb_sessions").update({ last_seen_at: new Date().toISOString() }).eq("id", session.id);
  return user;
}

async function publicBootstrap() {
  const from = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
  const to = new Date(Date.now() + 240 * 86400000).toISOString().slice(0, 10);
  const [events, layouts, layoutTables] = await Promise.all([
    db.from("bb_events").select("id,business_date,name,kind,type,starts_at,ends_at,layout_id,planned_guests,use_tables,comment,status").gte("business_date", from).lte("business_date", to).eq("status", "active").order("starts_at"),
    db.from("bb_layouts").select("id,name,layout_key,background_url,canvas_width,canvas_height,capacity,active").eq("active", true),
    db.from("bb_layout_tables").select("layout_id,table_no,name,x,y,width,height,rotation,shape,capacity,active").eq("active", true),
  ]);
  for (const r of [events, layouts, layoutTables]) if (r.error) throw r.error;
  const eventIds = (events.data || []).filter((e:any) => e.use_tables).map((e:any) => e.id);
  let eventTables:any[] = [], occupied:any[] = [];
  if (eventIds.length) {
    const [et, bt] = await Promise.all([
      db.from("bb_event_tables").select("event_id,table_no,layout_id,active,x,y,width,height,rotation,shape,capacity").in("event_id", eventIds).eq("active", true),
      db.from("bb_booking_tables").select("event_id,table_no,booking_id").in("event_id", eventIds).is("released_at", null),
    ]);
    if (et.error || bt.error) throw et.error || bt.error;
    eventTables = et.data || []; occupied = bt.data || [];
  }
  return { events: events.data || [], layouts: layouts.data || [], layoutTables: layoutTables.data || [], eventTables, occupied, serverTime: new Date().toISOString() };
}

async function adminBootstrap() {
  const [events, layouts, lt, et, bookings, bt, clients, notes, settings, history, guestUsers] = await Promise.all([
    db.from("bb_events").select("*").order("starts_at"), db.from("bb_layouts").select("*").order("name"), db.from("bb_layout_tables").select("*").order("layout_id").order("table_no"), db.from("bb_event_tables").select("*").order("event_id").order("table_no"),
    db.from("bb_bookings").select("*").order("arrival_at", { ascending: false }).limit(5000), db.from("bb_booking_tables").select("*").is("released_at", null), db.from("bb_clients").select("*").order("last_booking_at", { ascending: false, nullsFirst: false }).limit(5000),
    db.from("bb_client_notes").select("*").order("created_at", { ascending: false }).limit(5000), db.from("bb_settings").select("*"), db.from("bb_booking_history").select("*").order("created_at", { ascending: false }).limit(2000), db.from("bb_guest_users").select("id,client_id,phone,active,created_at,updated_at").order("created_at", { ascending: false }).limit(5000),
  ]);
  for (const r of [events, layouts, lt, et, bookings, bt, clients, notes, settings, history, guestUsers]) if (r.error) throw r.error;
  return { events: events.data || [], layouts: layouts.data || [], layoutTables: lt.data || [], eventTables: et.data || [], bookings: bookings.data || [], bookingTables: bt.data || [], clients: clients.data || [], clientNotes: notes.data || [], settings: settings.data || [], history: history.data || [], guestUsers: guestUsers.data || [], serverTime: new Date().toISOString(), version: "db-2" };
}

async function upsertClient(name: string, phone: string) {
  const p = normPhone(phone); if (!p) throw new Error("PHONE_REQUIRED");
  const { data: existing, error } = await db.from("bb_clients").select("id,name,phone").eq("phone", p).maybeSingle(); if (error) throw error;
  if (existing) { if (name && name !== existing.name) await db.from("bb_clients").update({ name, updated_at: new Date().toISOString() }).eq("id", existing.id); return existing.id; }
  const { data, error: e2 } = await db.from("bb_clients").insert({ phone: p, name: name || "" }).select("id").single(); if (e2) throw e2; return data.id;
}

async function saveEvent(p:any) {
  const id = cleanText(p.id || `e_${crypto.randomUUID()}`, 120); if (!p.business_date || !p.starts_at || !p.ends_at) throw new Error("EVENT_DATES_REQUIRED");
  const row = { id, business_date: p.business_date, name: cleanText(p.name || "Мероприятие", 160), kind: p.kind === "club_shift" ? "club_shift" : "event", type: cleanText(p.type || "other", 40), starts_at: p.starts_at, ends_at: p.ends_at, layout_id: p.layout_id || null, planned_guests: Math.max(0, Number(p.planned_guests || 0)), use_tables: Boolean(p.use_tables), comment: cleanText(p.comment || "", 4000), status: cleanText(p.status || "active", 30), updated_at: new Date().toISOString() };
  const { error } = await db.from("bb_events").upsert(row, { onConflict: "id" }); if (error) throw error;
  const { error: syncErr } = await db.rpc("bb_sync_event_tables", { p_event_id: id }); if (syncErr) throw syncErr; return id;
}

async function deleteEvent(id:string) {
  const { data: bs, error } = await db.from("bb_bookings").select("id").eq("event_id", id).neq("status", "cancelled"); if (error) throw error;
  for (const b of bs || []) { const { error: ce } = await db.rpc("bb_cancel_booking", { p_booking_id: b.id, p_actor_type: "admin", p_actor_id: "admin", p_reason: "event_cancelled" }); if (ce) throw ce; }
  const { error: e2 } = await db.from("bb_events").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", id); if (e2) throw e2;
}

async function saveBooking(p:any, source = "admin", ownerGuestUserId:string|null = null) {
  if (!p.event_id || !p.arrival_at) throw new Error("BOOKING_EVENT_AND_TIME_REQUIRED");
  const phone = normPhone(p.phone); const clientId = await upsertClient(cleanText(p.name || "", 160), phone); const tables = Array.isArray(p.tables) ? [...new Set(p.tables.map(Number).filter((n:number) => Number.isInteger(n) && n > 0))] : [];
  const args = { p_booking_id: p.id || null, p_event_id: p.event_id, p_name: cleanText(p.name || "", 160), p_phone: phone, p_guests: Math.max(1, Number(p.guests || 1)), p_arrival_at: p.arrival_at, p_deposit: Math.max(0, Number(p.deposit || 0)), p_prepay: Math.max(0, Number(p.prepay || 0)), p_status: cleanText(p.status || "hold", 30), p_comment: cleanText(p.comment || "", 4000), p_source: source, p_created_by: source === "guest" ? String(ownerGuestUserId || "guest") : "admin", p_table_nos: tables, p_client_id: clientId, p_owner_guest_user_id: ownerGuestUserId, p_idempotency_key: p.idempotency_key || null };
  const { data, error } = await db.rpc("bb_upsert_booking", args); if (error) throw error; return data;
}

async function saveLayout(p:any) {
  const id = cleanText(p.id || `layout_${crypto.randomUUID()}`, 120), tables = Array.isArray(p.tables) ? p.tables : [];
  const row = { id, name: cleanText(p.name || "Новая схема", 160), layout_key: cleanText(p.layout_key || id, 120), background_url: cleanText(p.background_url || "", 2000), canvas_width: Math.max(320, Number(p.canvas_width || 1000)), canvas_height: Math.max(320, Number(p.canvas_height || 1400)), capacity: tables.filter((t:any)=>t.active !== false).length, active: p.active !== false, updated_at: new Date().toISOString() };
  const { error } = await db.from("bb_layouts").upsert(row, { onConflict: "id" }); if (error) throw error;
  const { error: delError } = await db.from("bb_layout_tables").delete().eq("layout_id", id); if (delError) throw delError;
  if (tables.length) { const rows = tables.map((t:any, i:number) => ({ layout_id: id, table_no: Math.max(1, Number(t.table_no || i + 1)), name: cleanText(t.name || "", 80), x: Number(t.x || 0), y: Number(t.y || 0), width: Math.max(2, Number(t.width || 8)), height: Math.max(2, Number(t.height || 8)), rotation: Number(t.rotation || 0), shape: cleanText(t.shape || "round", 30), capacity: Math.max(1, Number(t.capacity || 4)), active: t.active !== false })); const { error: ins } = await db.from("bb_layout_tables").insert(rows); if (ins) throw ins; }
  const { data: events, error: ee } = await db.from("bb_events").select("id").eq("layout_id", id).eq("status", "active"); if (ee) throw ee; for (const e of events || []) { const { error: se } = await db.rpc("bb_sync_event_tables", { p_event_id: e.id }); if (se) throw se; } return id;
}

async function updateClient(p:any) {
  if (!p.id) throw new Error("CLIENT_ID_REQUIRED"); const patch:any = { updated_at: new Date().toISOString() };
  if (p.name !== undefined) patch.name = cleanText(p.name, 160); if (p.phone !== undefined) patch.phone = normPhone(p.phone); if (p.telegram !== undefined) patch.telegram = cleanText(p.telegram, 120); if (p.note !== undefined) patch.note = cleanText(p.note, 4000); if (p.vip !== undefined) patch.vip = Boolean(p.vip); if (p.blacklist !== undefined) patch.blacklist = Boolean(p.blacklist); if (p.tags !== undefined) patch.tags = Array.isArray(p.tags) ? p.tags.map((x:any)=>cleanText(x,60)).filter(Boolean).slice(0,30) : [];
  const { data, error } = await db.from("bb_clients").update(patch).eq("id", p.id).select("*").single(); if (error) throw error; return data;
}

async function createGuestSession(userId:string) { const token = newToken(), tokenHash = await sha256(token), expires = new Date(Date.now() + 30 * 86400000).toISOString(); const { error } = await db.from("bb_sessions").insert({ token_hash: tokenHash, session_type: "guest", guest_user_id: userId, expires_at: expires }); if (error) throw error; return { token, expiresAt: expires }; }

Deno.serve(async (req:Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method === "GET") return reply({ ok: true, service: "bali-booking-api", version: "db-2", time: new Date().toISOString() });
  if (req.method !== "POST") return reply({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
  try {
    const body = await req.json().catch(() => ({})), action = String(body.action || ""), p = body.payload || {};
    if (action === "health") return reply({ ok: true, service: "bali-booking-api", version: "db-2", time: new Date().toISOString() });
    if (action === "public.bootstrap") return reply({ ok: true, data: await publicBootstrap() });
    if (action === "guest.signup") { const phone = normPhone(p.phone), name = cleanText(p.name, 160), password = String(p.password || ""); if (!phone || !name || password.length < 6 || password.length > 128) throw new Error("INVALID_SIGNUP_DATA"); const { data: exists } = await db.from("bb_guest_users").select("id").eq("phone", phone).maybeSingle(); if (exists) throw new Error("PHONE_ALREADY_REGISTERED"); const clientId = await upsertClient(name, phone), hash = bcrypt.hashSync(password, 10); const { data: user, error } = await db.from("bb_guest_users").insert({ client_id: clientId, phone, password_hash: hash }).select("id,client_id,phone").single(); if (error) throw error; return reply({ ok: true, data: { user, ...(await createGuestSession(user.id)) } }); }
    if (action === "guest.login") { const phone = normPhone(p.phone), password = String(p.password || ""); const { data: user, error } = await db.from("bb_guest_users").select("id,client_id,phone,password_hash,active").eq("phone", phone).maybeSingle(); if (error || !user || !user.active || !bcrypt.compareSync(password, user.password_hash)) throw new Error("INVALID_LOGIN"); return reply({ ok: true, data: { user: { id: user.id, client_id: user.client_id, phone: user.phone }, ...(await createGuestSession(user.id)) } }); }
    if (action.startsWith("guest.")) { const guest = await requireGuest(req); if (action === "guest.bootstrap") { const pub = await publicBootstrap(); const { data: mine, error } = await db.from("bb_bookings").select("*").eq("owner_guest_user_id", guest.id).order("arrival_at", { ascending: false }); if (error) throw error; const ids = (mine || []).map((b:any)=>b.id); let myBookingTables:any[] = []; if (ids.length) { const { data: mbt, error: me } = await db.from("bb_booking_tables").select("booking_id,event_id,table_no,released_at").in("booking_id", ids); if (me) throw me; myBookingTables = mbt || []; } return reply({ ok: true, data: { ...pub, myBookings: mine || [], myBookingTables } }); } if (action === "guest.create_booking") return reply({ ok: true, data: { id: await saveBooking(p, "guest", guest.id) } }); if (action === "guest.update_booking") { const { data: own } = await db.from("bb_bookings").select("id").eq("id", p.id).eq("owner_guest_user_id", guest.id).maybeSingle(); if (!own) throw new Error("BOOKING_NOT_FOUND"); return reply({ ok: true, data: { id: await saveBooking(p, "guest", guest.id) } }); } if (action === "guest.cancel_booking") { const { data: own } = await db.from("bb_bookings").select("id").eq("id", p.id).eq("owner_guest_user_id", guest.id).maybeSingle(); if (!own) throw new Error("BOOKING_NOT_FOUND"); const { error } = await db.rpc("bb_cancel_booking", { p_booking_id: p.id, p_actor_type: "guest", p_actor_id: guest.id, p_reason: "guest_cancelled" }); if (error) throw error; return reply({ ok: true }); } throw new Error("UNKNOWN_GUEST_ACTION"); }
    if (action.startsWith("admin.")) { await requireAdmin(req); if (action === "admin.bootstrap") return reply({ ok: true, data: await adminBootstrap() }); if (action === "admin.save_event") return reply({ ok: true, data: { id: await saveEvent(p) } }); if (action === "admin.delete_event") { await deleteEvent(cleanText(p.id, 120)); return reply({ ok: true }); } if (action === "admin.save_booking") return reply({ ok: true, data: { id: await saveBooking(p, "admin", null) } }); if (action === "admin.cancel_booking") { const { error } = await db.rpc("bb_cancel_booking", { p_booking_id: p.id, p_actor_type: "admin", p_actor_id: "admin", p_reason: cleanText(p.reason || "admin_cancelled", 400) }); if (error) throw error; return reply({ ok: true }); } if (action === "admin.checkin_booking") { const { error } = await db.rpc("bb_checkin_booking", { p_booking_id: p.id, p_actor_id: "admin" }); if (error) throw error; return reply({ ok: true }); } if (action === "admin.add_client_note") { if (!p.client_id || !cleanText(p.body)) throw new Error("NOTE_REQUIRED"); const { data, error } = await db.from("bb_client_notes").insert({ client_id: p.client_id, booking_id: p.booking_id || null, body: cleanText(p.body, 4000), created_by: "admin" }).select("*").single(); if (error) throw error; return reply({ ok: true, data }); } if (action === "admin.update_client") return reply({ ok: true, data: await updateClient(p) }); if (action === "admin.save_layout") return reply({ ok: true, data: { id: await saveLayout(p) } }); if (action === "admin.archive_layout") { const { error } = await db.from("bb_layouts").update({ active: false, updated_at: new Date().toISOString() }).eq("id", p.id); if (error) throw error; return reply({ ok: true }); } if (action === "admin.reset_guest_password") { const pass = String(p.password || ""); if (!p.guest_user_id || pass.length < 6 || pass.length > 128) throw new Error("INVALID_PASSWORD"); const { error } = await db.from("bb_guest_users").update({ password_hash: bcrypt.hashSync(pass, 10), updated_at: new Date().toISOString() }).eq("id", p.guest_user_id); if (error) throw error; await db.from("bb_sessions").delete().eq("guest_user_id", p.guest_user_id); return reply({ ok: true }); } throw new Error("UNKNOWN_ADMIN_ACTION"); }
    throw new Error("UNKNOWN_ACTION");
  } catch (err) { const message = String((err as any)?.message || err || "UNKNOWN_ERROR"); const status = message.includes("UNAUTHORIZED") ? 401 : message.includes("NOT_FOUND") ? 404 : message.includes("ALREADY") || message.includes("PHONE_ALREADY") || message.includes("duplicate key") ? 409 : 400; return reply({ ok: false, error: message }, status); }
});
