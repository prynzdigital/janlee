/* JanLee CRM — single-page admin (no dependencies).
   Data: Neon Postgres + Vercel Blob through the site's own API (/api/auth, /api/data, /api/files).
   Sign-in uses an HttpOnly session cookie set by the server. When the API isn't available
   (e.g. local preview) it runs in DEMO mode on sample data kept in this browser only. */
(() => {
  'use strict';
  const CFG = window.CRM_CONFIG || {};
  let DEMO = true; // decided in boot() by asking the API
  const IG = CFG.instagram || 'https://www.instagram.com/interiorsbyjanlee/';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const app = $('#app');

  // ---------- constants ----------
  const STAGES = [
    { id: 'new', label: 'New' }, { id: 'contacted', label: 'Contacted' }, { id: 'consultation', label: 'Consultation' },
    { id: 'proposal', label: 'Proposal' }, { id: 'won', label: 'Won' }, { id: 'lost', label: 'Lost' },
  ];
  const OPEN = ['new', 'contacted', 'consultation', 'proposal'];
  const stageLabel = id => STAGES.find(s => s.id === id)?.label || id;
  const PSTATUS = [
    { id: 'planning', label: 'Planning' }, { id: 'design', label: 'Design' }, { id: 'in_progress', label: 'In progress' },
    { id: 'on_hold', label: 'On hold' }, { id: 'completed', label: 'Completed' },
  ];
  const pLabel = id => PSTATUS.find(s => s.id === id)?.label || id;
  const SOURCES = [['website', 'Website'], ['referral', 'Referral'], ['phone', 'Phone call'], ['email', 'Email'], ['social', 'Instagram / social'], ['repeat', 'Repeat client'], ['other', 'Other']];
  const srcLabel = id => (SOURCES.find(s => s[0] === id) || [, id])[1];
  const PTYPES = ['Interior design & decorating', 'Kitchen renovation', 'Bathroom renovation', 'Whole-home remodel', 'Color consultation', 'Furniture selection / repurposing', 'Commercial space', 'Something else'];
  const KINDS = [['note', 'Note'], ['call', 'Call'], ['email', 'Email'], ['meeting', 'Meeting']];

  // ---------- icons ----------
  const P = {
    dash: '<rect x="4" y="4" width="10" height="12" rx="2"/><rect x="18" y="4" width="10" height="7" rx="2"/><rect x="18" y="15" width="10" height="13" rx="2"/><rect x="4" y="20" width="10" height="8" rx="2"/>',
    leads: '<path d="M4 6h24l-9 11v8l-6 3V17z"/>',
    tasks: '<rect x="5" y="5" width="22" height="22" rx="4"/><path d="m11 16 4 4 7-8"/>',
    clients: '<circle cx="12" cy="11" r="5"/><path d="M3 27c1-5 5-8 9-8s8 3 9 8"/><circle cx="23" cy="9" r="3.5"/><path d="M22 17c4 0 6.5 2.5 7 6"/>',
    projects: '<path d="M4 15 16 5l12 10M7 13v14h18V13M13 27v-8h6v8"/>',
    plus: '<path d="M16 6v20M6 16h20"/>', close: '<path d="m8 8 16 16M24 8 8 24"/>', back: '<path d="M26 16H6M14 8l-8 8 8 8"/>',
    phone: '<path d="M8 4h4l2 6-3 2a15 15 0 0 0 9 9l2-3 6 2v4a3 3 0 0 1-3 3A23 23 0 0 1 5 7a3 3 0 0 1 3-3Z"/>',
    mail: '<rect x="4" y="7" width="24" height="18" rx="2"/><path d="m4 9 12 8 12-8"/>',
    note: '<path d="M7 4h13l5 5v19H7z"/><path d="M20 4v5h5M11 15h10M11 20h10"/>', meet: '<rect x="4" y="6" width="24" height="22" rx="2"/><path d="M4 12h24M10 3v6M22 3v6"/>',
    stage: '<path d="M5 16h18M17 9l7 7-7 7"/>', alert: '<path d="M16 4 2 28h28z"/><path d="M16 13v7M16 24v.5"/>', clock: '<circle cx="16" cy="16" r="12"/><path d="M16 9v7l5 3"/>',
    check: '<path d="m7 16 6 6 12-13"/>', out: '<path d="M13 6H6v20h7M20 10l6 6-6 6M26 16H12"/>', site: '<circle cx="16" cy="16" r="12"/><path d="M4 16h24M16 4c4 4 4 20 0 24M16 4c-4 4-4 20 0 24"/>',
    dl: '<path d="M16 4v16M9 13l7 7 7-7M5 26h22"/>',
    chev: '<path d="m12 8 8 8-8 8"/>',
    user: '<circle cx="16" cy="11" r="6"/><path d="M5 28c1.5-6 6-9 11-9s9.5 3 11 9"/>',
    key: '<circle cx="10" cy="20" r="6"/><path d="m14.5 15.5 11-11M21 9l3 3M18 12l3 3"/>',
    eye: '<path d="M2 16s5-9 14-9 14 9 14 9-5 9-14 9S2 16 2 16Z"/><circle cx="16" cy="16" r="4"/>',
    eyeoff: '<path d="M4 4l24 24M13 8.4A13 13 0 0 1 16 8c9 0 14 8 14 8a24 24 0 0 1-4 4.6M8 9.6C4.4 12 2 16 2 16s5 8 14 8a13 13 0 0 0 5.4-1.2"/><path d="M13.2 13.2a4 4 0 0 0 5.6 5.6"/>',
    arrowR: '<path d="M6 16h20M19 9l7 7-7 7"/>',
    search: '<circle cx="14" cy="14" r="9"/><path d="m21 21 7 7"/>',
    list: '<path d="M11 8h16M11 16h16M11 24h16M5 8h.01M5 16h.01M5 24h.01"/>',
    money: '<rect x="3" y="8" width="26" height="16" rx="3"/><circle cx="16" cy="16" r="3.5"/><path d="M7 12v.01M25 20v.01"/>',
    trophy: '<path d="M10 5h12v6a6 6 0 0 1-12 0zM10 8H5a5 5 0 0 0 5 5M22 8h5a5 5 0 0 1-5 5M16 17v5M11 27h10M12 22h8v5h-8z"/>',
    bell: '<path d="M8 22V14a8 8 0 0 1 16 0v8l2 3H6zM13 28a3 3 0 0 0 6 0"/>',
    chart: '<path d="M5 27h22M9 23V15M16 23V8M23 23v-5"/>',
    edit: '<path d="M20 6l6 6-14 14H6v-6z"/><path d="M17 9l6 6"/>',
    trash: '<path d="M5 9h22M12 9V5h8v4M8 9l1.5 18h13L24 9M13 14v8M19 14v8"/>',
    pin: '<path d="M16 29s9-8.4 9-15a9 9 0 0 0-18 0c0 6.6 9 15 9 15Z"/><circle cx="16" cy="14" r="3.2"/>',
    lock: '<rect x="6" y="14" width="20" height="14" rx="3"/><path d="M11 14V10a5 5 0 0 1 10 0v4"/>',
    ig: '<rect x="4" y="4" width="24" height="24" rx="7"/><circle cx="16" cy="16" r="5.5"/><circle cx="23" cy="9" r="1.2" fill="currentColor" stroke="none"/>', star: '<path d="m16 3 3.9 8.4 9.1 1-6.8 6.2 1.9 9-8.1-4.6-8.1 4.6 1.9-9L3 12.4l9.1-1z"/>',
  };
  const icon = (n, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;

  // ---------- dates & numbers ----------
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => iso(new Date());
  const addDays = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };
  const dayOf = ts => iso(new Date(ts));
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmtDate = s => { if (!s) return ''; const d = new Date(s.length === 10 ? s + 'T12:00:00' : s); return `${MON[d.getMonth()]} ${d.getDate()}${d.getFullYear() !== new Date().getFullYear() ? ', ' + d.getFullYear() : ''}`; };
  const rel = ts => {
    const days = Math.round((new Date(today() + 'T12:00:00') - new Date(dayOf(ts) + 'T12:00:00')) / 864e5);
    return days === 0 ? 'Today' : days === 1 ? 'Yesterday' : days < 7 ? `${days} days ago` : fmtDate(ts);
  };
  const money = n => n == null || n === '' ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(n));
  const compact = n => n >= 1e6 ? '$' + (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : n >= 1e4 ? '$' + Math.round(n / 1e3) + 'K' : money(n);
  const initials = n => {
    const w = String(n || '?').split(/\s+/).filter(Boolean);
    if (w.length === 1) { const caps = w[0].match(/[A-Z]/g) || []; return (caps.length > 1 ? caps[0] + caps[1] : w[0][0]).toUpperCase(); } // "JanLee" -> "JL"
    return (w[0][0] + w[w.length - 1][0]).toUpperCase();
  };
  function dueBadge(due) {
    if (!due) return '';
    const t = today();
    if (due < t) return `<span class="status status-crit">${icon('alert')} Overdue · ${fmtDate(due)}</span>`;
    if (due === t) return `<span class="status status-warn">${icon('clock')} Due today</span>`;
    return `<span class="status status-muted">${icon('clock')} ${fmtDate(due)}</span>`;
  }

  // ---------- UI helpers ----------
  function toast(msg, err = false) {
    const t = document.createElement('div');
    t.className = 'toast' + (err ? ' err' : '');
    t.innerHTML = `${err ? '' : icon('check')}<span>${esc(msg)}</span>`;
    $('#toasts').appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }
  const modal = $('#modal'), modalBody = $('#modal-body');
  function openModal(html, onSubmit) {
    modalBody.innerHTML = html;
    modal.showModal();
    const f = $('form', modalBody);
    if (f && onSubmit) f.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = $('button[type=submit]', f); if (btn) btn.disabled = true;
      try { await onSubmit(Object.fromEntries(new FormData(f)), f); }
      catch (err) { console.error(err); toast(err.message || 'Something went wrong', true); }
      finally { if (btn) btn.disabled = false; }
    });
    setTimeout(() => $('input:not([type=hidden]),select,textarea', modalBody)?.focus(), 30);
  }
  const closeModal = () => modal.open && modal.close();
  modal.addEventListener('click', e => { if (e.target === modal || e.target.closest('[data-close]')) closeModal(); });
  const confirmBox = (title, text, okLabel = 'Delete') => new Promise(res => {
    openModal(`<div class="modal-head"><h2>${esc(title)}</h2></div><p>${esc(text)}</p>
      <div class="modal-foot"><button class="btn btn-ghost" type="button" data-no>Cancel</button><button class="btn btn-danger" type="button" data-yes>${esc(okLabel)}</button></div>`);
    $('[data-yes]', modalBody).onclick = () => { closeModal(); res(true); };
    $('[data-no]', modalBody).onclick = () => { closeModal(); res(false); };
    modal.addEventListener('close', () => res(false), { once: true });
  });
  const opts = (list, sel) => list.map(([v, l]) => `<option value="${esc(v)}"${v === sel ? ' selected' : ''}>${esc(l)}</option>`).join('');
  const clean = v => { const s = String(v ?? '').trim(); return s === '' ? null : s; };
  const num = v => { const s = String(v ?? '').replace(/[$,\s]/g, ''); return s === '' ? null : Math.max(0, Number(s)) || 0; };

  // ---------- API client (same-origin; session is an HttpOnly cookie) ----------
  const ERR = {
    invalid: 'Some details aren’t valid — please check and try again.',
    rate_limited: 'Too many attempts. Please wait 15 minutes and try again.',
    wrong_password: 'Your current password is incorrect.',
    weak_password: 'Use at least 12 characters.',
    too_large: 'That file is over 4 MB.',
    type_not_allowed: 'That file type isn’t supported (images, PDF, Word, Excel or text).',
    blob_not_configured: 'File storage isn’t connected yet.',
    origin: 'Security check failed — please reload the page.',
    not_configured: 'The CRM isn’t fully set up yet.',
    not_found: 'That item no longer exists.',
    same_as_temp: 'Please choose a new password, not the temporary one.',
    must_change_password: 'Please choose your own password first.',
    forbidden: 'Only an admin can do that.',
    email_taken: 'Someone on the team already uses that email.',
    bad_email: 'Please enter a valid email address.',
    name_required: 'Please enter a name.',
    not_on_self: 'You can’t do that to your own account.',
    too_many_users: 'The team limit (25) has been reached.',
    same_password: 'Choose a password different from your current one.',
  };
  async function api(path, { method = 'GET', body, raw, type } = {}) {
    const r = await fetch(path, {
      method, credentials: 'same-origin', cache: 'no-store',
      headers: method === 'GET' ? {} : { 'X-CRM': '1', 'Content-Type': raw ? type : 'application/json' },
      body: raw || (body === undefined ? undefined : JSON.stringify(body)),
    });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && j.error === 'signed_out') { auth.s = null; throw Object.assign(new Error('signed_out'), { code: 'signed_out' }); }
    if (!r.ok || j.ok === false) throw Object.assign(new Error(ERR[j.error] || `Request failed (${r.status})`), { code: j.error, data: j });
    return j;
  }
  const auth = {
    s: null, // { email } while signed in
    async me() {
      try {
        const r = await fetch('/api/auth', { credentials: 'same-origin', cache: 'no-store' });
        if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) return null;
        return await r.json();
      } catch { return null; }
    },
    async signIn(email, password, remember = true) {
      try { await api('/api/auth', { method: 'POST', body: { op: 'login', email, password, remember } }); }
      catch (e) {
        if (e.code !== 'invalid') throw e;
        const left = e.data?.remaining;
        throw new Error(`Email or password is incorrect.${left != null && left <= 2 ? ` ${left === 0 ? 'Sign-in is now paused for 15 minutes.' : `${left} attempt${left === 1 ? '' : 's'} left before a 15-minute pause.`}` : ''}`);
      }
      const m = await this.me();
      this.s = { email: m?.email || email }; S.profile = m?.profile || null;
    },
    async signOut() { try { await api('/api/auth', { method: 'POST', body: { op: 'logout' } }); } catch {} this.s = null; },
    changePassword: (current, next) => api('/api/auth', { method: 'POST', body: { op: 'password', current, next } }),
    async recover() { throw new Error('reset_unavailable'); },
  };
  const RESET_HELP = 'To reset a forgotten password, your web admin updates ADMIN_PASSWORD in Vercel (Settings → Environment Variables) and redeploys. The new password works straight away.';

  // ---------- data layer ----------
  const TABLES = ['leads', 'clients', 'projects', 'activities', 'tasks'];
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  const remote = {
    async loadAll() { const j = await api('/api/data'); TABLES.forEach(t => { S[t] = j[t] || []; }); S.files = j.files || []; },
    insert: async (t, row) => (await api('/api/data', { method: 'POST', body: { op: 'insert', table: t, row } })).row,
    update: async (t, id, patch) => (await api('/api/data', { method: 'POST', body: { op: 'update', table: t, id, row: patch } })).row,
    remove: (t, id) => api('/api/data', { method: 'POST', body: { op: 'delete', table: t, id } }),
  };
  const DKEY = 'jl-crm-demo-v2';
  const demo = {
    data: null,
    load() { if (this.data) return; try { this.data = JSON.parse(localStorage.getItem(DKEY) || 'null'); } catch {} if (!this.data) { this.data = seed(); this.persist(); } },
    persist() { try { localStorage.setItem(DKEY, JSON.stringify(this.data)); } catch {} },
    async all(t) { this.load(); return [...this.data[t]].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)); },
    async insert(t, row) { this.load(); const r = { id: uid(), created_at: new Date().toISOString(), ...row }; this.data[t].push(r); this.persist(); return r; },
    async update(t, id, patch) { this.load(); const r = this.data[t].find(x => x.id === id); Object.assign(r, patch, { updated_at: new Date().toISOString() }); this.persist(); return r; },
    async remove(t, id) {
      this.load(); this.data[t] = this.data[t].filter(x => x.id !== id);
      // mimic ON DELETE CASCADE / SET NULL
      const fk = { leads: 'lead_id', clients: 'client_id', projects: 'project_id' }[t];
      if (fk) ['activities', 'tasks'].forEach(c => { this.data[c] = this.data[c].filter(x => x[fk] !== id); });
      if (t === 'clients') { this.data.projects = this.data.projects.filter(p => p.client_id !== id); this.data.leads.forEach(l => { if (l.client_id === id) l.client_id = null; }); }
      this.persist();
    },
    reset() { this.data = seed(); this.persist(); },
  };
  const db = () => (DEMO ? demo : remote);
  const S = { leads: [], clients: [], projects: [], activities: [], tasks: [], files: [], profile: null, loaded: false, me: null, team: null };
  const isAdmin = () => DEMO || S.me?.role === 'admin';
  const roleLabel = () => DEMO ? 'Demo mode' : S.me?.owner ? 'Owner' : S.me?.role === 'admin' ? 'Admin' : 'Team member';
  async function loadAll() {
    if (DEMO) { const res = await Promise.all(TABLES.map(t => demo.all(t))); TABLES.forEach((t, i) => { S[t] = res[i] || []; }); }
    else await remote.loadAll();
    S.loaded = true;
  }
  async function insert(t, row) { const r = await db().insert(t, row); S[t].unshift(r); return r; }
  async function update(t, id, patch) { const r = await db().update(t, id, patch); const i = S[t].findIndex(x => x.id === id); if (i > -1) S[t][i] = { ...S[t][i], ...r }; return S[t][i]; }
  async function remove(t, id) { await db().remove(t, id); if (!DEMO) await loadAll(); else TABLES.forEach(x => { S[x] = demo.data[x].slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1)); }); }
  const log = (body, ref, kind = 'note') => insert('activities', { kind, body, ...ref });
  const byId = (t, id) => S[t].find(x => x.id === id);

  // ---------- demo seed (relative to today so the dashboard looks alive) ----------
  function seed() {
    const now = new Date(), ago = d => new Date(now - d * 864e5).toISOString(), inDays = d => addDays(today(), d);
    const L = (name, d, stage, type, value, src = 'website', fu = null, msg = '') => ({
      id: uid(), created_at: ago(d), updated_at: ago(Math.max(0, d - 2)), name, email: name.toLowerCase().replace(/[^a-z]+/g, '.') + '@example.com',
      phone: `(719) 555-0${String(100 + Math.floor(d * 7) % 900).padStart(3, '0')}`, zip: '80903', project_type: type, source: src, stage, value, next_follow_up: fu,
      message: msg || `Hello JanLee — we'd love help with a ${type.toLowerCase()}. Looking to start in the next few months.`, lost_reason: stage === 'lost' ? 'Went with a lower budget option' : null, client_id: null,
      seen_at: d <= 3 && src === 'website' ? null : ago(Math.max(0, d - 1)),
    });
    const leads = [
      L('Avery Collins', 1, 'new', 'Kitchen renovation', 45000, 'website', inDays(0), 'Our kitchen is from the 90s and we want something warm and timeless — sage cabinets maybe? Budget is flexible for the right design.'),
      L('Jordan Whitfield', 3, 'new', 'Bathroom renovation', 22000, 'website', inDays(1)),
      L('Morgan Ellis', 6, 'contacted', 'Whole-home remodel', 120000, 'referral', inDays(-1)),
      L('Riley Sanders', 9, 'consultation', 'Interior design & decorating', 18000, 'website', inDays(3)),
      L('Casey Monroe', 14, 'proposal', 'Kitchen renovation', 58000, 'repeat', inDays(2)),
      L('Taylor Brooks', 21, 'contacted', 'Color consultation', 1500, 'social', inDays(-3)),
      L('Quinn Harper', 33, 'won', 'Bathroom renovation', 26000, 'referral'),
      L('Drew Patterson', 41, 'lost', 'Commercial space', 35000, 'website'),
      L('Sydney Lane', 55, 'won', 'Whole-home remodel', 95000, 'website'),
      L('Reese Carter', 68, 'proposal', 'Furniture selection / repurposing', 6500, 'email', inDays(5)),
      L('Parker Hayes', 84, 'won', 'Interior design & decorating', 14000, 'repeat'),
      L('Emerson Price', 102, 'lost', 'Kitchen renovation', 40000, 'website'),
      L('Blake Turner', 125, 'won', 'Kitchen renovation', 52000, 'referral'),
      L('Hayden Ross', 150, 'consultation', 'Whole-home remodel', 80000, 'phone', inDays(7)),
      L('Logan Reyes', 2, 'new', 'Interior design & decorating', null, 'website', null),
    ];
    const C = (lead, address) => ({ id: uid(), created_at: lead.updated_at, name: lead.name, email: lead.email, phone: lead.phone, address, notes: '', lead_id: lead.id });
    const won = leads.filter(l => l.stage === 'won');
    const clients = won.map((l, i) => C(l, ['Rockrimmon, Colorado Springs', 'Broadmoor, Colorado Springs', 'Cordera, Colorado Springs', 'Old North End, Colorado Springs'][i % 4]));
    won.forEach((l, i) => { l.client_id = clients[i].id; });
    const Pj = (c, name, status, budget, s, t, done = null) => ({ id: uid(), created_at: c.created_at, client_id: c.id, name, status, budget, start_date: s, target_date: t, completed_date: done, notes: '' });
    const projects = [
      Pj(clients[0], 'Primary bath remodel', 'in_progress', 26000, inDays(-20), inDays(25)),
      Pj(clients[1], 'Whole-home refresh', 'design', 95000, inDays(-10), inDays(90)),
      Pj(clients[2], 'Living & dining redesign', 'completed', 14000, inDays(-80), inDays(-30), inDays(-28)),
      Pj(clients[3], 'Kitchen renovation', 'completed', 52000, inDays(-120), inDays(-40), inDays(-35)),
      Pj(clients[1], 'Guest suite', 'planning', 12000, null, inDays(120)),
    ];
    const A = (kind, body, d, ref) => ({ id: uid(), created_at: ago(d), kind, body, ...ref });
    const activities = [
      A('note', 'Website enquiry received.', 1, { lead_id: leads[0].id }),
      A('call', 'Left a voicemail introducing myself. Will try again tomorrow.', 5, { lead_id: leads[2].id }),
      A('meeting', 'Walked the space — open plan, great light. Loves warm wood and brass.', 8, { lead_id: leads[3].id }),
      A('email', 'Sent proposal with two layout options and finish board.', 12, { lead_id: leads[4].id }),
      A('stage', 'Stage changed: Proposal → Won', 30, { lead_id: leads[6].id }),
      A('note', 'Tile order placed — arriving in 2 weeks.', 4, { client_id: clients[0].id, project_id: projects[0].id }),
    ];
    const T = (title, due, ref, done = false) => ({ id: uid(), created_at: ago(3), title, due_date: due, done, completed_at: done ? ago(1) : null, ...ref });
    const tasks = [
      T('Call Avery about kitchen consultation', inDays(0), { lead_id: leads[0].id }),
      T('Follow up with Morgan — referral from Quinn', inDays(-1), { lead_id: leads[2].id }),
      T('Send color samples to Taylor', inDays(-3), { lead_id: leads[5].id }),
      T('Confirm vanity delivery date', inDays(2), { client_id: clients[0].id, project_id: projects[0].id }),
      T('Finalize finish board for whole-home refresh', inDays(6), { client_id: clients[1].id, project_id: projects[1].id }),
      T('Photograph completed living room', null, { client_id: clients[2].id }),
      T('Order fabric swatches', inDays(-6), {}, true),
    ];
    return { leads, clients, projects, activities, tasks };
  }

  // ---------- charts (SVG, single series, hover tooltip + table view) ----------
  const niceMax = m => { if (m <= 0) return 4; const p = Math.pow(10, Math.floor(Math.log10(m))); const n = m / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; };
  const roundTop = (x, y, w, h, r) => { r = Math.min(r, h, w / 2); return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`; };
  const roundRight = (x, y, w, h, r) => { r = Math.min(r, w, h / 2); return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`; };
  let chartSeq = 0;
  function chartTable(id, rows, unit) {
    return `<div class="chart-foot"><button class="linklike" type="button" data-toggle-table="${id}" aria-expanded="false" aria-controls="${id}">View as table</button></div>
      <table class="chart-table" id="${id}" hidden><thead><tr><th scope="col">Category</th><th scope="col">${esc(unit)}</th></tr></thead>
      <tbody>${rows.map(r => `<tr><td>${esc(r.label)}</td><td>${esc(r.display ?? r.value)}</td></tr>`).join('')}</tbody></table>`;
  }
  function columnChart(rows, { unit = 'Leads', label = '' } = {}) {
    const W = 560, H = 210, padL = 30, padB = 26, padT = 18, iw = W - padL - 8, ih = H - padT - padB;
    const max = niceMax(Math.max(...rows.map(r => r.value), 1)), slot = iw / rows.length, bw = Math.min(22, slot * .5);
    const ticks = [0, .5, 1].map(f => Math.round(max * f));
    const id = 'ct' + (++chartSeq);
    const peak = rows.reduce((a, r, i) => (r.value > rows[a].value ? i : a), 0);
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">
      <g class="grid">${ticks.map(t => { const y = padT + ih - (t / max) * ih; return `<line x1="${padL}" x2="${W - 8}" y1="${y}" y2="${y}"/>`; }).join('')}</g>
      <g class="axis">${ticks.map(t => `<text x="${padL - 6}" y="${padT + ih - (t / max) * ih + 4}" text-anchor="end">${t}</text>`).join('')}
        ${rows.map((r, i) => `<text x="${padL + slot * i + slot / 2}" y="${H - 8}" text-anchor="middle">${esc(r.label)}</text>`).join('')}</g>
      ${rows.map((r, i) => {
        const x = padL + slot * i + (slot - bw) / 2, h = r.value ? Math.max(3, (r.value / max) * ih) : 2, y = padT + ih - h;
        return `<g data-tip="${esc(r.tip || `${r.label}: ${r.value} ${unit.toLowerCase()}`)}"><rect class="hit" x="${padL + slot * i}" y="${padT}" width="${slot}" height="${ih}"/>
          <path class="bar${r.value ? '' : ' zero'}" d="${roundTop(x, y, bw, h, 4)}"/>
          ${i === rows.length - 1 || i === peak ? `<text class="val" x="${x + bw / 2}" y="${y - 6}" text-anchor="middle">${r.value}</text>` : ''}</g>`;
      }).join('')}
    </svg>${chartTable(id, rows, unit)}`;
  }
  function barChart(rows, { unit = 'Count', label = '' } = {}) {
    const W = 560, row = 34, bh = 16, padL = 150, padR = 64, H = rows.length * row + 6, iw = W - padL - padR;
    const max = Math.max(...rows.map(r => r.value), 1), id = 'ct' + (++chartSeq);
    const short = s => (s.length > 22 ? s.slice(0, 21) + '…' : s);
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">
      ${rows.map((r, i) => {
        const y = i * row + (row - bh) / 2, w = r.value ? Math.max(3, (r.value / max) * iw) : 2;
        return `<g data-tip="${esc(r.tip || `${r.label}: ${r.display ?? r.value}`)}"><rect class="hit" x="0" y="${i * row}" width="${W}" height="${row}"/>
          <text class="lbl" x="${padL - 10}" y="${y + bh / 2 + 4}" text-anchor="end">${esc(short(r.label))}</text>
          <path class="bar${r.value ? '' : ' zero'}" d="${roundRight(padL, y, w, bh, 4)}"/>
          <text class="val" x="${padL + w + 8}" y="${y + bh / 2 + 4}">${esc(r.display ?? r.value)}</text></g>`;
      }).join('')}
    </svg>${chartTable(id, rows, unit)}`;
  }
  // tooltip + table toggles (delegated)
  const tip = $('#tip');
  document.addEventListener('mouseover', e => {
    const g = e.target.closest('[data-tip]');
    if (!g) { tip.hidden = true; return; }
    const [a, ...b] = g.dataset.tip.split(': ');
    tip.innerHTML = `<strong>${esc(a)}</strong>${esc(b.join(': '))}`; tip.hidden = false;
  });
  document.addEventListener('mousemove', e => { if (!tip.hidden) { tip.style.left = Math.min(e.clientX + 14, innerWidth - 230) + 'px'; tip.style.top = e.clientY + 14 + 'px'; } });

  // ---------- derived data ----------
  const monthKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  const openTasks = () => S.tasks.filter(t => !t.done);
  // notifications: leads (mostly website enquiries) not opened yet
  // did FormSubmit email this website enquiry? (visitor must finish the robot check)
  function emailStatus(l) {
    if (l.source !== 'website') return '';
    if (l.email_confirmed_at) return `<span class="status status-good">${icon('mail')} Email sent</span>`;
    if (!l.email_pending) return '';
    return (Date.now() - new Date(l.created_at)) / 60000 < 15
      ? `<span class="status status-muted">${icon('clock')} Waiting for robot check</span>`
      : `<span class="status status-warn" title="The visitor didn’t finish FormSubmit’s robot check, so no email or confirmation was sent. Reply from the CRM.">${icon('alert')} No email sent · robot check not finished</span>`;
  }
  const unread = () => S.leads.filter(l => !l.seen_at).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  const dueCount = () => openTasks().filter(t => t.due_date && t.due_date <= today()).length
    + S.leads.filter(l => OPEN.includes(l.stage) && l.next_follow_up && l.next_follow_up <= today()).length;
  const refName = r => {
    if (r.project_id && byId('projects', r.project_id)) { const p = byId('projects', r.project_id); return `${p.name} · ${byId('clients', p.client_id)?.name || ''}`; }
    if (r.client_id && byId('clients', r.client_id)) return byId('clients', r.client_id).name;
    if (r.lead_id && byId('leads', r.lead_id)) return byId('leads', r.lead_id).name;
    return '';
  };
  const refHref = r => r.client_id ? `#/clients/${r.client_id}` : r.lead_id ? `#/leads/${r.lead_id}` : '';

  // ---------- views ----------
  const MARK = '<svg class="mark" viewBox="0 0 44 52" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 50V22a18 18 0 0 1 36 0v28"/><path d="M12 50V23a10 10 0 0 1 20 0v27"/><path d="M1 50h42"/></svg>';
  const avClass = n => 'av-' + ([...String(n || '')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 6);
  const avatar = (name, cls = '') => `<span class="avatar ${avClass(name)} ${cls}" aria-hidden="true">${esc(initials(name))}</span>`;
  const stagePill = s => `<span class="stage-pill"><span class="dot dot-${s}"></span>${esc(stageLabel(s))}</span>`;
  const empty = (ic, title, text = '', cls = '') => `<div class="empty ${cls}"><span class="empty-ic">${icon(ic)}</span><strong>${esc(title)}</strong>${text ? `<span>${esc(text)}</span>` : ''}</div>`;
  const cardHead = (ic, title, sub = '', link = '') => `<div class="card-head"><div class="card-title"><span class="chip-ic">${icon(ic)}</span><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div></div>${link}</div>`;
  function spark(vals) {
    if (!vals.length) return '';
    const max = Math.max(...vals, 1), W = 100, H = 30, step = W / Math.max(vals.length - 1, 1);
    const pts = vals.map((v, i) => [i * step, H - 3 - (v / max) * (H - 6)]);
    const line = pts.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ');
    const last = pts[pts.length - 1];
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><polygon class="area" points="0,${H} ${line} ${W},${H}"/><polyline points="${line}"/><circle cx="${last[0]}" cy="${last[1]}" r="3.5"/></svg>`;
  }
  function progress(p) {
    if (p.status === 'completed') return { pct: 100, cls: 'full', label: 'Completed' };
    if (!p.start_date || !p.target_date) return null;
    const s = new Date(p.start_date + 'T12:00:00'), t = new Date(p.target_date + 'T12:00:00'), n = new Date(today() + 'T12:00:00');
    const pct = Math.max(0, Math.min(100, Math.round(((n - s) / Math.max(t - s, 864e5)) * 100)));
    const late = n > t;
    const days = Math.round((t - n) / 864e5);
    return { pct, cls: late ? 'late' : '', label: late ? `${-days} day${days === -1 ? '' : 's'} past target` : days === 0 ? 'Due today' : `${days} day${days === 1 ? '' : 's'} to go` };
  }
  const progressBar = pr => pr ? `<div class="progress ${pr.cls}" role="img" aria-label="${esc(pr.label)}, ${pr.pct}% of timeline"><svg viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden="true"><rect x="0" y="0" height="6" rx="3" width="${pr.pct}"/></svg></div>` : '';

  const NAV = [['dashboard', 'Dashboard', 'dash'], ['leads', 'Leads', 'leads'], ['tasks', 'Tasks', 'tasks'], ['clients', 'Clients', 'clients'], ['projects', 'Projects', 'projects']];
  function shell(route, inner) {
    const due = dueCount(), news = unread().length;
    const badge = { leads: news ? `<b class="badge" aria-label="${news} new">${news > 99 ? '99+' : news}</b>` : '', tasks: due ? `<b class="badge" aria-label="${due} due">${due}</b>` : '' };
    const link = ([id, label, ic]) => `<a href="#/${id}"${route === id ? ' aria-current="page"' : ''}>${icon(ic)}<span>${label}</span>${badge[id] || ''}</a>`;
    const who = DEMO ? 'Demo mode' : esc(auth.s?.email || '');
    return `<div class="shell">
      <aside class="sidenav" aria-label="CRM">
        <a class="side-brand" href="#/dashboard">${MARK}<span><span>Interiors by</span><strong>JanLee</strong></span></a>
        <div class="side-label">Workspace</div>
        <nav class="side-nav" aria-label="Sections">${NAV.map(link).join('')}</nav>
        ${isAdmin() ? `<div class="side-label">Admin</div><nav class="side-nav" aria-label="Admin"><a href="#/team"${route === 'team' ? ' aria-current="page"' : ''}>${icon('clients')}<span>Team & access</span></a></nav>` : ''}
        <div class="side-links">
          ${isAdmin() ? `<a href="#" data-action="export">${icon('dl')} Export leads (CSV)</a>` : ''}
          <a href="/" target="_blank" rel="noopener">${icon('site')} View website</a>
          <a href="${esc(IG)}" target="_blank" rel="noopener">${icon('ig')} Instagram</a>
          ${DEMO ? `<a href="#" data-action="reset-demo">${icon('star')} Reset demo data</a>` : ''}
        </div>
        <button class="side-user" type="button" data-action="account" aria-haspopup="dialog">${avatar(profile().name)}<div><strong>${esc(profile().name)}</strong><small>${esc(roleLabel())}${DEMO ? '' : ' · ' + who}</small></div>${icon('chev')}</button>
      </aside>
      <div>
        ${DEMO ? `<div class="demo-banner">${icon('star')}<span><strong>Demo mode</strong> — sample data stored only in this browser.</span></div>` : ''}
        <header class="topbar">
          <a class="mini-brand" href="#/dashboard">${MARK}<span><small>Interiors by</small>JanLee</span></a>
          <div class="gsearch" role="search">${icon('search')}<input class="input" type="search" data-gsearch placeholder="Search leads & clients…" aria-label="Search leads and clients" autocomplete="off"><div class="gresults" hidden></div></div>
          <span class="spacer"></span>
          <a class="icon-btn m-only" href="${esc(IG)}" target="_blank" rel="noopener" aria-label="Instagram (opens in a new tab)">${icon('ig')}</a>
          <button class="icon-btn bell-btn${news ? ' has-new' : ''}" type="button" data-action="notifications" aria-haspopup="dialog" aria-label="Notifications${news ? `, ${news} new` : ''}">${icon('bell')}${news ? `<b class="badge">${news > 99 ? '99+' : news}</b>` : ''}</button>
          <button class="btn btn-primary btn-sm" type="button" data-action="new-lead">${icon('plus')} Lead</button>
          <button class="account-btn" type="button" data-action="account" aria-haspopup="dialog" aria-label="Account: profile, password and sign out">${avatar(profile().name)}</button>
        </header>
        <main class="main${enterAnim ? ' enter' : ''}" id="main">${inner}</main>
      </div>
      <nav class="tabbar" aria-label="Sections">${NAV.map(link).join('')}</nav>
    </div>`;
  }

  function vDashboard() {
    const now = new Date(), mk = monthKey(now), prev = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const months = [...Array(6)].map((_, i) => { const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1); return { k: monthKey(d), label: MON[d.getMonth()] }; });
    const inMonth = (l, k) => monthKey(new Date(l.created_at)) === k;
    const thisM = S.leads.filter(l => inMonth(l, mk)).length, lastM = S.leads.filter(l => inMonth(l, prev)).length, delta = thisM - lastM;
    const open = S.leads.filter(l => OPEN.includes(l.stage));
    const openVal = open.reduce((s, l) => s + (Number(l.value) || 0), 0);
    const wonL = S.leads.filter(l => l.stage === 'won'), won = wonL.length, lost = S.leads.filter(l => l.stage === 'lost').length;
    const rate = won + lost ? Math.round((won / (won + lost)) * 100) : 0;
    const active = S.projects.filter(p => p.status !== 'completed');
    const t = today();
    const dueTasks = openTasks().filter(x => x.due_date && x.due_date <= t).sort((a, b) => (a.due_date < b.due_date ? -1 : 1));
    const dueFollow = open.filter(l => l.next_follow_up && l.next_follow_up <= t).sort((a, b) => (a.next_follow_up < b.next_follow_up ? -1 : 1));
    const perMonth = months.map(m => ({ label: m.label, value: S.leads.filter(l => inMonth(l, m.k)).length }));
    const wonPerMonth = months.map(m => wonL.filter(l => monthKey(new Date(l.updated_at || l.created_at)) === m.k).length);
    const stageRows = STAGES.filter(s => s.id !== 'lost').map(s => {
      const ls = S.leads.filter(l => l.stage === s.id), v = ls.reduce((a, l) => a + (Number(l.value) || 0), 0);
      return { label: s.label, value: ls.length, tip: `${s.label}: ${ls.length} lead${ls.length === 1 ? '' : 's'} · ${money(v)}` };
    });
    const typeRows = PTYPES.map(p => ({ label: p, value: S.leads.filter(l => l.project_type === p).length })).filter(r => r.value).sort((a, b) => b.value - a.value).slice(0, 6);
    const hello = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
    const n = dueFollow.length + dueTasks.length, newNow = S.leads.filter(l => l.stage === 'new').length;
    const summary = n || newNow
      ? `You have ${n ? `<strong>${n} item${n === 1 ? '' : 's'}</strong> needing attention today` : 'nothing overdue'}${newNow ? ` and <strong>${newNow} new lead${newNow === 1 ? '' : 's'}</strong> waiting for a reply` : ''}.`
      : 'You’re all caught up — a perfect day to dream up something beautiful.';
    const tile = (label, ic, value, deltaHtml, sp = '') => `<div class="stat-tile"><div class="stat-top"><span class="stat-label">${label}</span><span class="stat-ic">${icon(ic)}</span></div><div class="stat-value">${value}</div>${deltaHtml}${sp}</div>`;
    return `<section class="welcome" aria-label="Welcome">
        <img src="/assets/img/projects/calming-earthy-sage-green-kitchen/cover-lg.webp" alt="" width="1600" height="1066">
        <p class="eyebrow">${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        <h1>${hello}, JanLee</h1>
        <p>${summary}</p>
        <div class="head-actions"><button class="btn btn-gold" type="button" data-action="new-lead">${icon('plus')} New lead</button><button class="btn btn-glass" type="button" data-action="new-task">${icon('tasks')} Add task</button><a class="btn btn-glass hide-sm" href="#/leads">${icon('leads')} Pipeline</a></div>
      </section>
    ${unread().length ? `<section class="card notif-card" aria-labelledby="h-new">
        <div class="card-head"><div class="card-title"><span class="chip-ic pulse">${icon('bell')}</span><div><h2 id="h-new">${unread().length} new request${unread().length === 1 ? '' : 's'}</h2><p>From your website — reply soon to win the project</p></div></div><button class="linklike" type="button" data-action="mark-all-seen">Mark all as read</button></div>
        <div class="today-list">${unread().slice(0, 4).map(l => `<a class="today-item" href="#/leads/${l.id}">${avatar(l.name)}<span class="grow"><span class="t">${esc(l.name)} <span class="new-chip">New</span></span>${emailStatus(l).includes('No email') ? `<span class="email-status sm">${emailStatus(l)}</span>` : ''}<span class="s">${esc(l.project_type || 'Enquiry')} · ${rel(l.created_at)}${l.message ? ' · “' + esc(l.message.slice(0, 70)) + (l.message.length > 70 ? '…' : '') + '”' : ''}</span></span>${icon('chev', 'ic chev')}</a>`).join('')}</div>
        ${unread().length > 4 ? `<p class="more-new"><button class="linklike" type="button" data-action="notifications">See all ${unread().length} new requests</button></p>` : ''}
      </section>` : ''}
    <section class="stats" aria-label="Key numbers">
      ${tile('New leads this month', 'leads', thisM, `<div class="stat-delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}">${delta === 0 ? 'Same as last month' : `${delta > 0 ? '▲' : '▼'} ${Math.abs(delta)} vs last month`}</div>`, spark(perMonth.map(r => r.value)))}
      ${tile('Open pipeline', 'money', compact(openVal), `<div class="stat-delta">${open.length} open lead${open.length === 1 ? '' : 's'}</div>`)}
      ${tile('Win rate', 'trophy', `${rate}%`, `<div class="stat-delta">${won} won · ${lost} lost</div>`, spark(wonPerMonth))}
      ${tile('Active projects', 'projects', active.length, `<div class="stat-delta">${money(active.reduce((s, p) => s + (Number(p.budget) || 0), 0))} in budgets</div>`)}
    </section>
    <div class="dash-grid">
      <section class="card" aria-labelledby="h-today">
        ${cardHead('bell', '<span id="h-today">Needs attention</span>', 'Overdue and due today', '<a class="linklike" href="#/tasks">All tasks</a>')}
        <div class="today-list">
          ${dueFollow.map(l => `<a class="today-item" href="#/leads/${l.id}">${avatar(l.name)}<span class="grow"><span class="t">Follow up with ${esc(l.name)}</span><span class="s">${esc(stageLabel(l.stage))} · ${esc(l.project_type || '')}</span></span>${dueBadge(l.next_follow_up)}</a>`).join('')}
          ${dueTasks.map(x => `<label class="today-item"><input type="checkbox" data-task-done="${x.id}" aria-label="Mark done: ${esc(x.title)}"><span class="grow"><span class="t">${esc(x.title)}</span><span class="s">${esc(refName(x) || 'Task')}</span></span>${dueBadge(x.due_date)}</label>`).join('')}
          ${n ? '' : empty('check', 'All caught up', 'Nothing is overdue or due today.', 'good')}
        </div>
      </section>
      <section class="card" aria-labelledby="h-month">${cardHead('chart', '<span id="h-month">New leads per month</span>', 'Last 6 months')}${columnChart(perMonth, { unit: 'Leads', label: 'New leads per month, last 6 months' })}</section>
      <section class="card" aria-labelledby="h-stage">${cardHead('leads', '<span id="h-stage">Leads by stage</span>', 'Hover a bar for pipeline value', '<a class="linklike" href="#/leads">Open pipeline</a>')}${barChart(stageRows, { unit: 'Leads', label: 'Number of leads in each stage' })}</section>
      <section class="card" aria-labelledby="h-type">${cardHead('star', '<span id="h-type">What clients ask for</span>', 'Leads by project type')}${typeRows.length ? barChart(typeRows, { unit: 'Leads', label: 'Leads by project type' }) : empty('star', 'No leads yet')}</section>
      <section class="card span-2" aria-labelledby="h-recent">${cardHead('clients', '<span id="h-recent">Latest leads</span>', 'Newest enquiries first', '<a class="linklike" href="#/leads?view=list">See all</a>')}
        <div class="list">${S.leads.slice(0, 5).map(leadRow).join('') || empty('leads', 'No leads yet', 'Website enquiries will appear here automatically.')}</div></section>
    </div>`;
  }
  const leadRow = l => `<a class="row" href="#/leads/${l.id}">${avatar(l.name)}
    <span class="grow"><span class="t">${esc(l.name)}${!l.seen_at ? ' <span class="new-chip">New</span>' : ''}</span><span class="s">${esc(l.project_type || '—')} · ${esc(srcLabel(l.source))} · ${rel(l.created_at)}</span></span>
    <span class="r">${stagePill(l.stage)}<small>${l.value ? money(l.value) : ''}</small></span></a>`;

  let leadView = 'board', leadQuery = '', leadStage = 'all';
  function vLeads(params) {
    if (params.get('view')) leadView = params.get('view');
    const q = leadQuery.toLowerCase();
    const match = l => !q || [l.name, l.email, l.phone, l.project_type, l.message].some(v => String(v || '').toLowerCase().includes(q));
    const list = S.leads.filter(match);
    const open = S.leads.filter(l => OPEN.includes(l.stage));
    const head = `<div class="page-head"><div><p class="eyebrow">Pipeline</p><h1>Leads</h1><p>${open.length} open · ${money(open.reduce((s, l) => s + (Number(l.value) || 0), 0))} potential value</p></div>
      <div class="head-actions"><button class="btn btn-primary" type="button" data-action="new-lead">${icon('plus')} New lead</button></div></div>
      <div class="toolbar"><label class="searchbox">${icon('search')}<span class="sr">Search leads</span><input class="input" type="search" placeholder="Search name, email, phone, project…" value="${esc(leadQuery)}" data-search="leads"></label>
        <div class="seg" role="group" aria-label="View"><button type="button" data-leadview="board" aria-pressed="${leadView === 'board'}">${icon('dash')} Board</button><button type="button" data-leadview="list" aria-pressed="${leadView === 'list'}">${icon('list')} List</button></div></div>`;
    if (leadView === 'board') {
      const fine = matchMedia('(pointer: fine)').matches;
      return head + `<div class="board">${STAGES.map(s => {
        const ls = list.filter(l => l.stage === s.id), v = ls.reduce((a, l) => a + (Number(l.value) || 0), 0);
        return `<section class="col col-${s.id}" data-drop="${s.id}" aria-label="${s.label}"><div class="col-head"><h2><span class="dot dot-${s.id}"></span>${s.label}</h2><span class="count">${ls.length}</span></div>
          <div class="col-sum">${v ? compact(v) + ' value' : ''}</div>
          ${ls.map(l => `<a class="lead-card" href="#/leads/${l.id}" data-lead="${l.id}"${fine ? ' draggable="true"' : ''}>
            <span class="lc-top">${avatar(l.name)}<span><span class="n">${!l.seen_at ? '<span class="new-dot" aria-label="New"></span>' : ''}${esc(l.name)}</span><span class="p">${esc(l.project_type || '—')}</span></span></span>
            <span class="lc-foot">${l.value ? `<span class="v">${money(l.value)}</span>` : '<span class="v"></span>'}${OPEN.includes(l.stage) && l.next_follow_up ? dueBadge(l.next_follow_up) : `<span>${rel(l.created_at)}</span>`}</span></a>`).join('') || `<div class="empty">${fine ? 'Drag a lead here' : 'No leads'}</div>`}
        </section>`;
      }).join('')}</div>`;
    }
    const counts = Object.fromEntries(STAGES.map(s => [s.id, list.filter(l => l.stage === s.id).length]));
    const shown = list.filter(l => leadStage === 'all' || l.stage === leadStage);
    return head + `<div class="chips" role="group" aria-label="Filter by stage"><button class="chip" type="button" data-stagefilter="all" aria-pressed="${leadStage === 'all'}">All<span>${list.length}</span></button>
      ${STAGES.map(s => `<button class="chip" type="button" data-stagefilter="${s.id}" aria-pressed="${leadStage === s.id}"><span class="dot dot-${s.id}"></span>${s.label}<span>${counts[s.id]}</span></button>`).join('')}</div>
      <div class="list">${shown.map(leadRow).join('') || empty('search', 'No leads match', 'Try a different search or filter.')}</div>`;
  }

  const KIND_IC = { note: 'note', call: 'phone', email: 'mail', meeting: 'meet', stage: 'stage' };
  function timeline(ref) {
    const key = Object.keys(ref)[0], items = S.activities.filter(a => a[key] === ref[key]);
    return `<form class="note-form" data-note='${esc(JSON.stringify(ref))}'>
        <label class="sr" for="note-body">Add a note</label><textarea class="input" id="note-body" name="body" rows="3" maxlength="5000" placeholder="Add a note, call summary or next step…" required></textarea>
        <div class="row-btns"><select class="input" name="kind" aria-label="Type">${opts(KINDS, 'note')}</select><button class="btn btn-primary btn-sm" type="submit">${icon('plus')} Add to history</button></div></form>
      <div class="timeline">${items.map(a => `<div class="tl${a.kind === 'stage' ? ' is-stage' : ''}"><span class="tdot k-${esc(a.kind)}">${icon(KIND_IC[a.kind] || 'note')}</span><div><div class="body">${esc(a.body)}</div><div class="when">${esc((KINDS.find(k => k[0] === a.kind) || ['', a.kind === 'stage' ? 'Update' : 'Note'])[1])} · ${rel(a.created_at)}${a.author ? ' · ' + esc(a.author) : ''}</div></div></div>`).join('') || empty('note', 'No history yet', 'Notes, calls and stage changes will appear here.')}</div>`;
  }
  function taskList(ref) {
    const key = Object.keys(ref)[0], items = S.tasks.filter(t => t[key] === ref[key]).sort((a, b) => (a.done - b.done) || String(a.due_date || '9').localeCompare(String(b.due_date || '9')));
    return `<div class="list"><form class="add-inline" data-addtask='${esc(JSON.stringify(ref))}'><input class="input" name="title" maxlength="200" placeholder="New task…" required aria-label="Task"><input class="input" type="date" name="due_date" aria-label="Due date"><button class="btn btn-ghost btn-sm" type="submit">${icon('plus')} Add</button></form>
      ${items.map(taskItem).join('') || empty('tasks', 'No tasks yet')}</div>`;
  }
  const taskItem = x => `<div class="task${x.done ? ' is-done' : ''}"><input type="checkbox" data-task-done="${x.id}" ${x.done ? 'checked' : ''} aria-label="${x.done ? 'Mark not done' : 'Mark done'}: ${esc(x.title)}">
    <div class="grow"><div class="t">${esc(x.title)}</div><div class="s">${x.done ? `<span class="status status-good">${icon('check')} Done ${x.completed_at ? rel(x.completed_at) : ''}</span>` : dueBadge(x.due_date)}${refName(x) ? (refHref(x) ? `<a href="${refHref(x)}">${esc(refName(x))}</a>` : `<span>${esc(refName(x))}</span>`) : ''}</div></div>
    <button class="icon-btn" type="button" data-task-del="${x.id}" aria-label="Delete task">${icon('trash')}</button></div>`;

  function stepper(l) {
    const order = ['new', 'contacted', 'consultation', 'proposal', 'won'];
    const lostAt = l.stage === 'lost';
    const idx = lostAt ? -1 : order.indexOf(l.stage);
    return `<div class="stepper${lostAt ? ' is-lost' : ''}" role="group" aria-label="Stage">${order.map((s, i) => `<button type="button" class="step${i < idx ? ' done' : ''}${i === idx ? ' current' : ''}${s === 'won' ? ' won-step' : ''}" data-step="${s}" data-id="${l.id}" aria-pressed="${i === idx}" aria-label="Set stage to ${stageLabel(s)}"><span class="bub">${icon('check')}</span>${stageLabel(s)}</button>`).join('')}</div>
      ${lostAt ? `<p class="lost-note"><span class="status status-muted">${icon('close')} Marked as lost</span>${l.lost_reason ? esc(l.lost_reason) : ''}<button class="linklike" type="button" data-step="new" data-id="${l.id}">Reopen lead</button></p>`
        : l.stage !== 'won' ? `<p class="lost-note"><button class="linklike" type="button" data-action="mark-lost" data-id="${l.id}">Mark as lost</button></p>` : ''}`;
  }
  const telHref = p => `tel:${esc(String(p).replace(/[^\d+]/g, ''))}`;
  function vLead(id) {
    const l = byId('leads', id);
    if (!l) return `<a class="back" href="#/leads">${icon('back')} Leads</a>${empty('search', 'This lead no longer exists')}`;
    const client = l.client_id && byId('clients', l.client_id);
    return `<a class="back" href="#/leads">${icon('back')} Leads</a>
    <section class="profile"><div class="profile-in">${avatar(l.name)}
      <div class="profile-txt"><h1>${esc(l.name)}</h1><div class="meta"><span>${icon('star')} ${esc(l.project_type || 'Lead')}</span><span>${icon('money')} ${money(l.value)}</span><span>${icon('clock')} Added ${rel(l.created_at)}</span><span>${icon('site')} ${esc(srcLabel(l.source))}</span></div>${emailStatus(l) ? `<div class="email-status">${emailStatus(l)}</div>` : ''}</div>
      <div class="head-actions">${l.phone ? `<a class="btn btn-ghost btn-sm" href="${telHref(l.phone)}">${icon('phone')} Call</a>` : ''}${l.email ? `<a class="btn btn-ghost btn-sm" href="mailto:${esc(l.email)}">${icon('mail')} Email</a>` : ''}<button class="btn btn-ghost btn-sm" type="button" data-action="edit-lead" data-id="${l.id}">${icon('edit')} Edit</button></div>
    </div>${stepper(l)}</section>
    <div class="detail">
      <section class="card">
        ${cardHead('clients', 'Details', l.next_follow_up && OPEN.includes(l.stage) ? 'Next follow-up ' + fmtDate(l.next_follow_up) : '')}
        <dl class="kv">
          <dt>Stage</dt><dd>${stagePill(l.stage)}</dd>
          <dt>Follow up</dt><dd>${l.next_follow_up ? dueBadge(l.next_follow_up) : '<span class="status status-muted">Not set</span>'}</dd>
          <dt>Email</dt><dd>${l.email ? `<a href="mailto:${esc(l.email)}">${esc(l.email)}</a>` : '—'}</dd>
          <dt>Phone</dt><dd>${l.phone ? `<a href="${telHref(l.phone)}">${esc(l.phone)}</a>` : '—'}</dd>
          <dt>Zip</dt><dd>${esc(l.zip || '—')}</dd>
          ${client ? `<dt>Client</dt><dd><a href="#/clients/${client.id}">${esc(client.name)}</a></dd>` : ''}
        </dl>
        ${l.message ? `<div class="message-box">${esc(l.message)}</div>` : ''}
        <div class="actions-row">${client ? `<a class="btn btn-ghost" href="#/clients/${client.id}">${icon('clients')} View client</a>` : `<button class="btn btn-gold" type="button" data-action="convert" data-id="${l.id}">${icon('check')} Convert to client</button>`}
          ${isAdmin() ? `<button class="btn btn-danger" type="button" data-action="del-lead" data-id="${l.id}">${icon('trash')} Delete</button>` : ''}</div>
      </section>
      <div class="detail-side">
        <section class="card">${cardHead('tasks', 'Tasks')}${taskList({ lead_id: l.id })}</section>
        <section class="card">${filesCard({ lead_id: l.id })}</section>
        <section class="card">${cardHead('note', 'History', 'Notes, calls & updates')}${timeline({ lead_id: l.id })}</section>
      </div>
    </div>`;
  }

  function vTasks() {
    const t = today(), open = openTasks();
    const groups = [
      ['Overdue', 'alert', open.filter(x => x.due_date && x.due_date < t), 'crit'],
      ['Today', 'clock', open.filter(x => x.due_date === t), ''],
      ['Upcoming', 'meet', open.filter(x => x.due_date && x.due_date > t), ''],
      ['No date', 'note', open.filter(x => !x.due_date), ''],
      ['Completed', 'check', S.tasks.filter(x => x.done).slice(0, 15), ''],
    ].map(([n, ic, items, c]) => [n, ic, items.sort((a, b) => String(a.due_date || '').localeCompare(String(b.due_date || ''))), c]);
    const follow = S.leads.filter(l => OPEN.includes(l.stage) && l.next_follow_up && l.next_follow_up <= addDays(t, 7)).sort((a, b) => (a.next_follow_up < b.next_follow_up ? -1 : 1));
    const overdue = open.filter(x => x.due_date && x.due_date < t).length;
    return `<div class="page-head"><div><p class="eyebrow">Stay on track</p><h1>Tasks</h1><p>${open.length} open${overdue ? ` · <span class="status status-crit">${icon('alert')} ${overdue} overdue</span>` : ''}</p></div></div>
      <div class="list"><form class="add-inline" data-addtask="{}"><input class="input" name="title" maxlength="200" placeholder="What needs doing?" required aria-label="Task"><input class="input" type="date" name="due_date" value="${t}" aria-label="Due date"><button class="btn btn-primary btn-sm" type="submit">${icon('plus')} Add task</button></form></div>
      ${follow.length ? `<h2 class="section-label">${icon('phone')} Lead follow-ups · next 7 days <span class="n">${follow.length}</span></h2><div class="list">${follow.map(l => `<a class="row" href="#/leads/${l.id}">${avatar(l.name)}<span class="grow"><span class="t">${esc(l.name)}</span><span class="s">${esc(stageLabel(l.stage))} · ${esc(l.project_type || '')}</span></span>${dueBadge(l.next_follow_up)}</a>`).join('')}</div>` : ''}
      ${groups.filter(([, , items]) => items.length).map(([n, ic, items, c]) => `<h2 class="section-label ${c}">${icon(ic)} ${n} <span class="n">${items.length}</span></h2><div class="list">${items.map(taskItem).join('')}</div>`).join('')}
      ${open.length || S.tasks.length ? '' : empty('tasks', 'No tasks yet', 'Add your first task above.')}`;
  }

  let clientQuery = '';
  function vClients() {
    const q = clientQuery.toLowerCase();
    const list = S.clients.filter(c => !q || [c.name, c.email, c.phone, c.address].some(v => String(v || '').toLowerCase().includes(q))).sort((a, b) => a.name.localeCompare(b.name));
    return `<div class="page-head"><div><p class="eyebrow">Relationships</p><h1>Clients</h1><p>${S.clients.length} client${S.clients.length === 1 ? '' : 's'}</p></div><div class="head-actions"><button class="btn btn-primary" type="button" data-action="new-client">${icon('plus')} New client</button></div></div>
      <div class="toolbar"><label class="searchbox">${icon('search')}<span class="sr">Search clients</span><input class="input" type="search" placeholder="Search clients…" value="${esc(clientQuery)}" data-search="clients"></label></div>
      ${list.length ? `<div class="client-grid">${list.map(c => {
        const ps = S.projects.filter(p => p.client_id === c.id), act = ps.filter(p => p.status !== 'completed').length, total = ps.reduce((s, p) => s + (Number(p.budget) || 0), 0);
        return `<a class="client-card" href="#/clients/${c.id}"><div class="cc-top">${avatar(c.name)}<div><span class="t">${esc(c.name)}</span><span class="s">${esc(c.address || c.email || c.phone || 'No contact details')}</span></div></div>
          <div class="cc-foot"><span class="status ${act ? 'status-good' : 'status-muted'}">${icon('projects')} ${act ? `${act} active` : 'No active projects'}</span><span class="status status-muted">${ps.length} project${ps.length === 1 ? '' : 's'}</span>${total ? `<span class="status status-muted">${compact(total)}</span>` : ''}</div></a>`;
      }).join('')}</div>` : `<div class="card">${empty('clients', q ? 'No clients match' : 'No clients yet', q ? 'Try a different search.' : 'Convert a won lead, or add one.')}</div>`}`;
  }

  function vClient(id) {
    const c = byId('clients', id);
    if (!c) return `<a class="back" href="#/clients">${icon('back')} Clients</a>${empty('search', 'This client no longer exists')}`;
    const ps = S.projects.filter(p => p.client_id === c.id), lead = c.lead_id && byId('leads', c.lead_id);
    const total = ps.reduce((s, p) => s + (Number(p.budget) || 0), 0), act = ps.filter(p => p.status !== 'completed').length;
    return `<a class="back" href="#/clients">${icon('back')} Clients</a>
    <section class="profile"><div class="profile-in">${avatar(c.name)}
      <div class="profile-txt"><h1>${esc(c.name)}</h1><div class="meta"><span>${icon('clock')} Client since ${fmtDate(c.created_at)}</span>${c.address ? `<span>${icon('pin')} ${esc(c.address)}</span>` : ''}</div></div>
      <div class="head-actions">${c.phone ? `<a class="btn btn-ghost btn-sm" href="${telHref(c.phone)}">${icon('phone')} Call</a>` : ''}${c.email ? `<a class="btn btn-ghost btn-sm" href="mailto:${esc(c.email)}">${icon('mail')} Email</a>` : ''}<button class="btn btn-ghost btn-sm" type="button" data-action="edit-client" data-id="${c.id}">${icon('edit')} Edit</button></div>
    </div></section>
    <div class="detail">
      <div class="detail-side">
        <section class="card">${cardHead('projects', 'Projects', '', `<button class="btn btn-ghost btn-sm" type="button" data-action="new-project" data-client="${c.id}">${icon('plus')} Project</button>`)}
          <div class="mini-stats"><div><small>Projects</small><strong>${ps.length}</strong></div><div><small>Active</small><strong>${act}</strong></div><div><small>Total budget</small><strong>${compact(total)}</strong></div></div>
          <div class="projects-stack">${ps.map(p => projectCard(p)).join('') || empty('projects', 'No projects yet')}</div></section>
        <section class="card">${cardHead('clients', 'Contact')}
          <dl class="kv"><dt>Email</dt><dd>${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : '—'}</dd><dt>Phone</dt><dd>${c.phone ? `<a href="${telHref(c.phone)}">${esc(c.phone)}</a>` : '—'}</dd><dt>Address</dt><dd>${esc(c.address || '—')}</dd>
          ${lead ? `<dt>Original lead</dt><dd><a href="#/leads/${lead.id}">${esc(lead.project_type || 'View lead')}</a></dd>` : ''}</dl>
          ${c.notes ? `<div class="message-box">${esc(c.notes)}</div>` : ''}
          ${isAdmin() ? `<div class="actions-row"><button class="btn btn-danger btn-sm" type="button" data-action="del-client" data-id="${c.id}">${icon('trash')} Delete client</button></div>` : ''}</section>
      </div>
      <div class="detail-side">
        <section class="card">${filesCard({ client_id: c.id }, ps)}</section>
        <section class="card">${cardHead('tasks', 'Tasks')}${taskList({ client_id: c.id })}</section>
        <section class="card">${cardHead('note', 'History', 'Notes, calls & updates')}${timeline({ client_id: c.id })}</section>
      </div>
    </div>`;
  }
  const pClass = s => ({ planning: 'status-muted', design: 'status-warn', in_progress: 'status-good', on_hold: 'status-crit', completed: 'status-muted' }[s]);
  const pIcon = s => ({ on_hold: 'alert', completed: 'check', in_progress: 'clock', design: 'edit' }[s] || 'note');
  const pStatus = p => `<span class="status ${pClass(p.status)}">${icon(pIcon(p.status))} ${esc(pLabel(p.status))}</span>`;
  function projectCard(p, withClient = false) {
    const c = byId('clients', p.client_id), pr = progress(p);
    return `<button class="project-card" type="button" data-action="edit-project" data-id="${p.id}">
      <span class="pc-top"><span class="t">${esc(p.name)}</span>${pStatus(p)}</span>
      ${withClient && c ? `<span class="proj-client">${avatar(c.name)}${esc(c.name)}</span>` : ''}
      <span class="s"><span>${icon('money')} ${money(p.budget)}</span>${pr && p.status !== 'completed' ? `<span>${esc(pr.label)}</span>` : ''}${p.completed_date ? `<span>Completed ${fmtDate(p.completed_date)}</span>` : ''}</span>
      ${pr ? progressBar(pr) + `<span class="p-dates"><span>${p.start_date ? fmtDate(p.start_date) : ''}</span><span>${p.target_date ? 'Target ' + fmtDate(p.target_date) : ''}</span></span>` : ''}
    </button>`;
  }

  let projFilter = 'active';
  function vProjects() {
    const f = p => projFilter === 'all' || (projFilter === 'active' ? p.status !== 'completed' : p.status === projFilter);
    const list = S.projects.filter(f).sort((a, b) => String(a.target_date || '9').localeCompare(String(b.target_date || '9')));
    const active = S.projects.filter(p => p.status !== 'completed');
    return `<div class="page-head"><div><p class="eyebrow">In progress</p><h1>Projects</h1><p>${active.length} active · ${money(active.reduce((s, p) => s + (Number(p.budget) || 0), 0))} in active budgets</p></div>
      <div class="head-actions"><button class="btn btn-primary" type="button" data-action="new-project">${icon('plus')} New project</button></div></div>
      <div class="chips" role="group" aria-label="Filter projects">${[['active', 'Active'], ...PSTATUS.map(s => [s.id, s.label]), ['all', 'All']].map(([v, l]) => `<button class="chip" type="button" data-projfilter="${v}" aria-pressed="${projFilter === v}">${l}<span>${S.projects.filter(p => v === 'all' || (v === 'active' ? p.status !== 'completed' : p.status === v)).length}</span></button>`).join('')}</div>
      ${list.length ? `<div class="proj-grid">${list.map(p => projectCard(p, true)).join('')}</div>` : `<div class="card">${empty('projects', 'No projects here', 'Projects are created from a client or with “New project”.')}</div>`}`;
  }

  // global search (topbar)
  function gsearch(q) {
    const box = $('.gresults'); if (!box) return;
    q = q.trim().toLowerCase();
    if (!q) { box.hidden = true; box.innerHTML = ''; return; }
    const hit = o => [o.name, o.email, o.phone, o.project_type, o.address].some(v => String(v || '').toLowerCase().includes(q));
    const leads = S.leads.filter(hit).slice(0, 5), clients = S.clients.filter(hit).slice(0, 4);
    box.innerHTML = [...clients.map(c => `<a href="#/clients/${c.id}">${avatar(c.name)}<span>${esc(c.name)}<small>Client${c.address ? ' · ' + esc(c.address) : ''}</small></span></a>`),
      ...leads.map(l => `<a href="#/leads/${l.id}">${avatar(l.name)}<span>${esc(l.name)}<small>Lead · ${esc(stageLabel(l.stage))} · ${esc(l.project_type || '')}</small></span></a>`)].join('') || `<div class="none">No matches for “${esc(q)}”.</div>`;
    box.hidden = false;
  }

  // ---------- forms ----------
  function leadForm(l = {}) {
    openModal(`<form class="form-stack" novalidate><div class="modal-head"><h2>${l.id ? 'Edit lead' : 'New lead'}</h2><button class="icon-btn" type="button" data-close aria-label="Close">${icon('close')}</button></div>
      <label class="field">Name *<input name="name" required maxlength="120" value="${esc(l.name)}" autocomplete="off"></label>
      <div class="grid-2"><label class="field">Email<input name="email" type="email" maxlength="254" value="${esc(l.email)}"></label><label class="field">Phone<input name="phone" type="tel" maxlength="30" value="${esc(l.phone)}"></label></div>
      <div class="grid-2"><label class="field">Project type<select name="project_type">${opts(PTYPES.map(p => [p, p]), l.project_type || PTYPES[0])}</select></label><label class="field">Source<select name="source">${opts(SOURCES, l.source || 'referral')}</select></label></div>
      <div class="grid-2"><label class="field">Stage<select name="stage">${opts(STAGES.map(s => [s.id, s.label]), l.stage || 'new')}</select></label><label class="field">Estimated value ($)<input name="value" inputmode="decimal" value="${esc(l.value ?? '')}" placeholder="e.g. 25000"></label></div>
      <div class="grid-2"><label class="field">Next follow-up<input name="next_follow_up" type="date" value="${esc(l.next_follow_up || '')}"></label><label class="field">Zip<input name="zip" maxlength="10" value="${esc(l.zip)}"></label></div>
      <label class="field">Notes / message<textarea name="message" maxlength="5000">${esc(l.message)}</textarea></label>
      <label class="field">Lost reason <small>(if lost)</small><input name="lost_reason" maxlength="300" value="${esc(l.lost_reason)}"></label>
      <div class="modal-foot"><button class="btn btn-ghost" type="button" data-close>Cancel</button><button class="btn btn-primary" type="submit">${l.id ? 'Save' : 'Add lead'}</button></div></form>`,
    async d => {
      if (!clean(d.name)) throw new Error('Please enter a name.');
      if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) throw new Error('Please enter a valid email.');
      const row = { name: clean(d.name), email: clean(d.email)?.toLowerCase() ?? null, phone: clean(d.phone), project_type: clean(d.project_type), source: d.source, stage: d.stage, value: num(d.value), next_follow_up: clean(d.next_follow_up), zip: clean(d.zip), message: clean(d.message), lost_reason: clean(d.lost_reason) };
      if (l.id) {
        if (row.stage !== l.stage) await log(`Stage changed: ${stageLabel(l.stage)} → ${stageLabel(row.stage)}`, { lead_id: l.id }, 'stage');
        await update('leads', l.id, row); toast('Lead saved');
      } else {
        const n = await insert('leads', { ...row, seen_at: new Date().toISOString() }); await log('Lead added manually.', { lead_id: n.id }); toast('Lead added'); location.hash = `#/leads/${n.id}`;
      }
      closeModal(); render();
    });
  }
  function clientForm(c = {}) {
    openModal(`<form class="form-stack"><div class="modal-head"><h2>${c.id ? 'Edit client' : 'New client'}</h2><button class="icon-btn" type="button" data-close aria-label="Close">${icon('close')}</button></div>
      <label class="field">Name *<input name="name" required maxlength="120" value="${esc(c.name)}"></label>
      <div class="grid-2"><label class="field">Email<input name="email" type="email" maxlength="254" value="${esc(c.email)}"></label><label class="field">Phone<input name="phone" type="tel" maxlength="30" value="${esc(c.phone)}"></label></div>
      <label class="field">Address<input name="address" maxlength="300" value="${esc(c.address)}"></label>
      <label class="field">Notes<textarea name="notes" maxlength="5000">${esc(c.notes)}</textarea></label>
      <div class="modal-foot"><button class="btn btn-ghost" type="button" data-close>Cancel</button><button class="btn btn-primary" type="submit">${c.id ? 'Save' : 'Add client'}</button></div></form>`,
    async d => {
      if (!clean(d.name)) throw new Error('Please enter a name.');
      const row = { name: clean(d.name), email: clean(d.email)?.toLowerCase() ?? null, phone: clean(d.phone), address: clean(d.address), notes: clean(d.notes) };
      if (c.id) { await update('clients', c.id, row); toast('Client saved'); }
      else { const n = await insert('clients', row); toast('Client added'); location.hash = `#/clients/${n.id}`; }
      closeModal(); render();
    });
  }
  function projectForm(p = {}, clientId) {
    if (!S.clients.length) return toast('Add a client first — projects belong to a client.', true);
    const cid = p.client_id || clientId || S.clients[0].id;
    openModal(`<form class="form-stack"><div class="modal-head"><h2>${p.id ? 'Edit project' : 'New project'}</h2><button class="icon-btn" type="button" data-close aria-label="Close">${icon('close')}</button></div>
      <label class="field">Project name *<input name="name" required maxlength="160" value="${esc(p.name)}" placeholder="e.g. Kitchen renovation"></label>
      <div class="grid-2"><label class="field">Client<select name="client_id">${opts(S.clients.slice().sort((a, b) => a.name.localeCompare(b.name)).map(c => [c.id, c.name]), cid)}</select></label><label class="field">Status<select name="status">${opts(PSTATUS.map(s => [s.id, s.label]), p.status || 'planning')}</select></label></div>
      <div class="grid-2"><label class="field">Budget ($)<input name="budget" inputmode="decimal" value="${esc(p.budget ?? '')}"></label><label class="field">Start date<input name="start_date" type="date" value="${esc(p.start_date || '')}"></label></div>
      <div class="grid-2"><label class="field">Target completion<input name="target_date" type="date" value="${esc(p.target_date || '')}"></label><label class="field">Completed on<input name="completed_date" type="date" value="${esc(p.completed_date || '')}"></label></div>
      <label class="field">Notes<textarea name="notes" maxlength="5000">${esc(p.notes)}</textarea></label>
      <div class="modal-foot">${p.id && isAdmin() ? `<button class="btn btn-danger" type="button" data-del-project="${p.id}">Delete</button><span class="spacer"></span>` : ''}<button class="btn btn-ghost" type="button" data-close>Cancel</button><button class="btn btn-primary" type="submit">${p.id ? 'Save' : 'Add project'}</button></div></form>`,
    async d => {
      if (!clean(d.name)) throw new Error('Please enter a project name.');
      const row = { name: clean(d.name), client_id: d.client_id, status: d.status, budget: num(d.budget), start_date: clean(d.start_date), target_date: clean(d.target_date), completed_date: clean(d.completed_date) || (d.status === 'completed' && !p.completed_date ? today() : null), notes: clean(d.notes) };
      if (p.id) {
        if (row.status !== p.status) await log(`${row.name}: ${pLabel(p.status)} → ${pLabel(row.status)}`, { client_id: row.client_id, project_id: p.id }, 'stage');
        await update('projects', p.id, row); toast('Project saved');
      } else { const n = await insert('projects', row); await log(`Project created: ${row.name}`, { client_id: row.client_id, project_id: n.id }); toast('Project added'); }
      closeModal(); render();
    });
    const del = $('[data-del-project]', modalBody);
    if (del) del.onclick = async () => { if (await confirmBox('Delete project?', `“${p.name}” and its tasks will be deleted. This can’t be undone.`)) { await remove('projects', p.id); toast('Project deleted'); render(); } };
  }
  function convertForm(l) {
    openModal(`<form class="form-stack"><div class="modal-head"><h2>Convert to client</h2><button class="icon-btn" type="button" data-close aria-label="Close">${icon('close')}</button></div>
      <p>${esc(l.name)} becomes a client and the lead is marked <strong>Won</strong>.</p>
      <label class="field">Client name<input name="name" required maxlength="120" value="${esc(l.name)}"></label>
      <label class="field">Address <small>(optional)</small><input name="address" maxlength="300"></label>
      <label class="check-row"><input type="checkbox" name="mk" value="1" checked> Also create a project</label>
      <div class="grid-2"><label class="field">Project name<input name="pname" maxlength="160" value="${esc(l.project_type || 'New project')}"></label><label class="field">Budget ($)<input name="budget" inputmode="decimal" value="${esc(l.value ?? '')}"></label></div>
      <div class="modal-foot"><button class="btn btn-ghost" type="button" data-close>Cancel</button><button class="btn btn-primary" type="submit">${icon('check')} Convert</button></div></form>`,
    async d => {
      const c = await insert('clients', { name: clean(d.name) || l.name, email: l.email, phone: l.phone, address: clean(d.address), lead_id: l.id, notes: null });
      if (l.stage !== 'won') await log(`Stage changed: ${stageLabel(l.stage)} → Won`, { lead_id: l.id }, 'stage');
      await update('leads', l.id, { stage: 'won', client_id: c.id, next_follow_up: null });
      await log(`Converted to client.`, { lead_id: l.id });
      if (d.mk) { const p = await insert('projects', { client_id: c.id, name: clean(d.pname) || 'New project', status: 'planning', budget: num(d.budget) }); await log(`Project created: ${p.name}`, { client_id: c.id, project_id: p.id }); }
      closeModal(); toast('Converted to client'); location.hash = `#/clients/${c.id}`;
    });
  }
  function taskForm() {
    const links = [['', 'Not linked'], ...S.leads.filter(l => OPEN.includes(l.stage)).map(l => ['lead:' + l.id, 'Lead · ' + l.name]), ...S.clients.map(c => ['client:' + c.id, 'Client · ' + c.name])];
    openModal(`<form class="form-stack"><div class="modal-head"><h2>New task</h2><button class="icon-btn" type="button" data-close aria-label="Close">${icon('close')}</button></div>
      <label class="field">Task *<input name="title" required maxlength="200" placeholder="e.g. Send proposal to the Collins family"></label>
      <div class="grid-2"><label class="field">Due date<input name="due_date" type="date" value="${today()}"></label><label class="field">Related to<select name="link">${opts(links, '')}</select></label></div>
      <div class="modal-foot"><button class="btn btn-ghost" type="button" data-close>Cancel</button><button class="btn btn-primary" type="submit">Add task</button></div></form>`,
    async d => {
      if (!clean(d.title)) throw new Error('Please describe the task.');
      const [k, id] = (d.link || '').split(':');
      await insert('tasks', { title: clean(d.title), due_date: clean(d.due_date), done: false, ...(k === 'lead' ? { lead_id: id } : k === 'client' ? { client_id: id } : {}) });
      closeModal(); toast('Task added'); render();
    });
  }

  // ---------- events (delegated) ----------
  app.addEventListener('click', async e => {
    const a = e.target.closest('[data-action],[data-leadview],[data-stagefilter],[data-projfilter],[data-toggle-table],[data-task-del],[data-step],[data-file-del]');
    if (!a) return;
    const act = a.dataset.action, id = a.dataset.id;
    if (a.dataset.fileDel) {
      const f = S.files.find(x => x.id === a.dataset.fileDel);
      if (f && await confirmBox('Delete file?', `“${f.name}” will be permanently deleted.`)) {
        try { await api(`/api/files?id=${encodeURIComponent(f.id)}`, { method: 'DELETE' }); S.files = S.files.filter(x => x.id !== f.id); toast('File deleted'); render(); } catch (err) { handleErr(err); }
      }
      return;
    }
    if (a.dataset.step) { try { await changeStage(a.dataset.id, a.dataset.step); } catch (err) { handleErr(err); } return; }
    if (a.dataset.leadview) { leadView = a.dataset.leadview; history.replaceState(null, '', '#/leads'); return render(); }
    if (a.dataset.stagefilter) { leadStage = a.dataset.stagefilter; return render(); }
    if (a.dataset.projfilter) { projFilter = a.dataset.projfilter; return render(); }
    if (a.dataset.toggleTable) { const t = document.getElementById(a.dataset.toggleTable); t.hidden = !t.hidden; a.setAttribute('aria-expanded', String(!t.hidden)); a.textContent = t.hidden ? 'View as table' : 'Hide table'; return; }
    if (a.dataset.taskDel) { const t = byId('tasks', a.dataset.taskDel); if (await confirmBox('Delete task?', `“${t.title}” will be removed.`)) { await remove('tasks', t.id); toast('Task deleted'); render(); } return; }
    e.preventDefault();
    try {
      if (act === 'new-lead') leadForm();
      else if (act === 'edit-lead') leadForm(byId('leads', id));
      else if (act === 'convert') convertForm(byId('leads', id));
      else if (act === 'mark-lost') lostForm(byId('leads', id));
      else if (act === 'del-lead') { const l = byId('leads', id); if (await confirmBox('Delete lead?', `${l.name} and their notes and tasks will be deleted. This can’t be undone.`)) { await remove('leads', id); toast('Lead deleted'); location.hash = '#/leads'; } }
      else if (act === 'new-client') clientForm();
      else if (act === 'edit-client') clientForm(byId('clients', id));
      else if (act === 'del-client') { const c = byId('clients', id); if (await confirmBox('Delete client?', `${c.name}, their projects, notes and tasks will be deleted. This can’t be undone.`)) { await remove('clients', id); toast('Client deleted'); location.hash = '#/clients'; } }
      else if (act === 'new-project') projectForm({}, a.dataset.client);
      else if (act === 'edit-project') projectForm(byId('projects', id));
      else if (act === 'new-task') taskForm();
      else if (act === 'export') exportCsv();
      else if (act === 'account') accountSheet();
      else if (act === 'notifications') notifSheet();
      else if (act === 'add-user') addUserForm();
      else if (act === 'edit-user') editUserForm(id);
      else if (act === 'mark-all-seen') await markAllSeen();
      else if (act === 'signout') { await auth.signOut(); location.hash = ''; render(); }
      else if (act === 'reset-demo') { if (await confirmBox('Reset demo data?', 'This restores the original sample data in this browser.', 'Reset')) { demo.reset(); await loadAll(); toast('Demo data reset'); render(); } }
    } catch (err) { handleErr(err); }
  });
  app.addEventListener('change', async e => {
    try {
      if (e.target.dataset.upload) return await uploadFiles(e.target);
      const done = e.target.dataset.taskDone, st = e.target.dataset.stageOf;
      if (done) { const on = e.target.checked; await update('tasks', done, { done: on, completed_at: on ? new Date().toISOString() : null }); toast(on ? 'Task completed' : 'Task reopened'); render(); }
      if (st) await changeStage(st, e.target.value);
    } catch (err) { handleErr(err); }
  });
  app.addEventListener('input', e => {
    if (e.target.matches('[data-gsearch]')) return gsearch(e.target.value);
    const s = e.target.dataset.search;
    if (!s) return;
    if (s === 'leads') leadQuery = e.target.value; else clientQuery = e.target.value;
    const pos = e.target.selectionStart; render();
    const el = $(`[data-search="${s}"]`); if (el) { el.focus(); el.setSelectionRange(pos, pos); }
  });
  app.addEventListener('submit', async e => {
    const f = e.target;
    try {
      if (f.dataset.note) {
        e.preventDefault(); const d = Object.fromEntries(new FormData(f)); if (!clean(d.body)) return;
        await log(clean(d.body).slice(0, 5000), JSON.parse(f.dataset.note), d.kind); toast('Added to history'); render();
      } else if (f.dataset.addtask !== undefined) {
        e.preventDefault(); const d = Object.fromEntries(new FormData(f)); if (!clean(d.title)) return;
        await insert('tasks', { title: clean(d.title).slice(0, 200), due_date: clean(d.due_date), done: false, ...JSON.parse(f.dataset.addtask || '{}') }); toast('Task added'); render();
      }
    } catch (err) { handleErr(err); }
  });
  app.addEventListener('keydown', e => { if (e.key === 'Escape' && e.target.matches('[data-gsearch]')) { e.target.value = ''; gsearch(''); } });
  app.addEventListener('focusout', e => { if (e.target.matches('[data-gsearch]')) setTimeout(() => { if (!document.activeElement?.closest('.gsearch')) gsearch(''); }, 150); });

  // ---------- files (Vercel Blob via /api/files) ----------
  const fileUrl = (f, dl) => `/api/files?id=${encodeURIComponent(f.id)}${dl ? '&download=1' : ''}`;
  const isImg = f => /^image\/(jpeg|png|webp|gif)$/.test(f.content_type);
  const kb = n => n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  function filesCard(ref, projectsOfClient = []) {
    const key = Object.keys(ref)[0];
    const pids = projectsOfClient.map(p => p.id);
    const list = S.files.filter(f => f[key] === ref[key] || (key === 'client_id' && pids.includes(f.project_id)));
    const projSelect = key === 'client_id' && projectsOfClient.length
      ? `<select class="input file-target" data-file-target aria-label="Attach to"><option value="">Attach to client</option>${projectsOfClient.map(p => `<option value="${p.id}">Project · ${esc(p.name)}</option>`).join('')}</select>` : '';
    return `${cardHead('note', 'Files', 'Photos, plans, contracts — up to 4 MB each', '')}
      ${DEMO ? empty('note', 'File uploads', 'Available once the CRM is connected to its database.') : S.filesReady === false ? empty('note', 'File storage not connected', 'Connect the Vercel Blob store to this project, then redeploy.') : `
      <div class="file-bar">${projSelect}<label class="btn btn-ghost btn-sm file-pick">${icon('plus')} Upload<input type="file" multiple data-upload='${esc(JSON.stringify(ref))}' accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.doc,.docx,.xls,.xlsx,.txt" class="sr"></label></div>
      <p class="upload-status" aria-live="polite"></p>
      ${list.length ? `<div class="file-grid">${list.map(f => {
        const proj = f.project_id && byId('projects', f.project_id);
        return `<div class="file-tile"><a href="${fileUrl(f)}" target="_blank" rel="noopener" class="file-thumb">${isImg(f) ? `<img src="${fileUrl(f)}" alt="${esc(f.name)}" loading="lazy">` : `<span class="file-ext">${esc((f.name.split('.').pop() || 'file').slice(0, 4).toUpperCase())}</span>`}</a>
          <div class="file-meta"><span class="t" title="${esc(f.name)}">${esc(f.name)}</span><span class="s">${kb(f.size)} · ${rel(f.created_at)}${proj ? ' · ' + esc(proj.name) : ''}</span></div>
          <div class="file-acts"><a class="icon-btn" href="${fileUrl(f, 1)}" aria-label="Download ${esc(f.name)}">${icon('dl')}</a>${isAdmin() ? `<button class="icon-btn" type="button" data-file-del="${f.id}" aria-label="Delete ${esc(f.name)}">${icon('trash')}</button>` : ''}</div></div>`;
      }).join('')}</div>` : empty('note', 'No files yet', 'Upload inspiration photos, floor plans or contracts.')}`}`;
  }
  // shrink large photos in the browser before upload (keeps them under the 4 MB limit and fast to load)
  async function shrink(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 1.5 * 1048576) return file;
    const bmp = await createImageBitmap(file).catch(() => null);
    if (!bmp) return file;
    const scale = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.85));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
  }
  async function uploadFiles(input) {
    const ref = JSON.parse(input.dataset.upload);
    const target = input.closest('.card')?.querySelector('[data-file-target]')?.value;
    const params = target ? { project_id: target } : ref;
    const status = input.closest('.card')?.querySelector('.upload-status');
    const files = [...input.files]; input.value = '';
    let done = 0;
    for (const f0 of files) {
      if (status) status.textContent = `Uploading ${done + 1} of ${files.length}…`;
      const f = await shrink(f0);
      if (f.size > 4 * 1048576) { toast(`${f0.name} is over 4 MB`, true); continue; }
      const type = f.type || 'application/octet-stream';
      const qs = new URLSearchParams({ name: f0.name, ...params }).toString();
      const j = await api(`/api/files?${qs}`, { method: 'POST', raw: f, type });
      S.files.unshift(j.file); done++;
    }
    if (done) toast(`Uploaded ${done} file${done === 1 ? '' : 's'}`);
    render();
  }


  // ---------- team & access (admins) ----------
  async function loadTeam() {
    if (DEMO) { S.team = { owner: { email: CFG.adminEmail, name: profile().name }, users: [] }; return; }
    S.team = await api('/api/users');
  }
  const ago = ts => ts ? rel(ts) : 'Never';
  function vTeam() {
    if (!isAdmin()) return `<div class="card">${empty('lock', 'Admins only', 'Ask an admin if you need access to team settings.')}</div>`;
    if (!S.team) { loadTeam().then(render).catch(handleErr); return '<div class="skel-wrap"><div class="skel"></div><div class="skel big"></div></div>'; }
    const { owner, users } = S.team;
    const status = u => !u.active ? `<span class="status status-muted">${icon('close')} Deactivated</span>`
      : u.must_change ? `<span class="status status-warn">${icon('clock')} Waiting for first sign-in</span>`
      : `<span class="status status-good">${icon('check')} Active</span>`;
    const rolePill = r => `<span class="role-pill role-${r}">${r === 'admin' ? 'Admin' : 'Team member'}</span>`;
    return `<div class="page-head"><div><p class="eyebrow">Admin</p><h1>Team & access</h1><p>${users.length + 1} account${users.length ? 's' : ''} · admins manage the team; team members can't delete records or export</p></div>
      <div class="head-actions"><button class="btn btn-primary" type="button" data-action="add-user">${icon('plus')} Add team member</button></div></div>
      ${DEMO ? `<div class="auth-note">${icon('star')}<p><strong>Demo mode.</strong> Adding team members works once the CRM is connected to its database.</p></div>` : ''}
      <div class="list team-list">
        <div class="row team-row">${avatar(owner.name)}<span class="grow"><span class="t">${esc(owner.name)} <span class="role-pill role-owner">${icon('star')} Owner</span></span><span class="s">${esc(owner.email)}</span></span>
          <span class="r"><span class="status status-good">${icon('lock')} Always admin</span></span></div>
        ${users.map(u => `<div class="row team-row${u.active ? '' : ' is-off'}">${avatar(u.name)}<span class="grow"><span class="t">${esc(u.name)} ${rolePill(u.role)}</span><span class="s">${esc(u.email)} · last sign-in ${ago(u.last_login_at)}</span><span class="team-status">${status(u)}</span></span>
          <span class="team-acts"><button class="btn btn-ghost btn-sm" type="button" data-action="edit-user" data-id="${u.id}">${icon('edit')} Manage</button></span></div>`).join('')}
      </div>
      ${users.length ? '' : `<div class="card team-empty">${empty('clients', 'Just you so far', 'Add an assistant, project manager or partner — they’ll get their own sign-in.')}</div>`}
      <section class="card roles-card">${cardHead('lock', 'What each role can do')}
        <table class="roles-table"><thead><tr><th scope="col"></th><th scope="col">Admin</th><th scope="col">Team member</th></tr></thead><tbody>
          <tr><td>View & edit leads, clients, projects, tasks, notes</td><td>${icon('check')}</td><td>${icon('check')}</td></tr>
          <tr><td>Upload files</td><td>${icon('check')}</td><td>${icon('check')}</td></tr>
          <tr><td>Delete leads, clients, projects & files</td><td>${icon('check')}</td><td>—</td></tr>
          <tr><td>Export leads (CSV)</td><td>${icon('check')}</td><td>—</td></tr>
          <tr><td>Add users, change roles, reset passwords</td><td>${icon('check')}</td><td>—</td></tr>
        </tbody></table></section>`;
  }
  const roleChoice = sel => `<fieldset class="role-choice"><legend>Role</legend>
      <label><input type="radio" name="role" value="staff"${sel !== 'admin' ? ' checked' : ''}><span><strong>Team member</strong><small>Works with leads, clients, projects and tasks. Can’t delete records, export or manage users.</small></span></label>
      <label><input type="radio" name="role" value="admin"${sel === 'admin' ? ' checked' : ''}><span><strong>Admin</strong><small>Full access, including deleting records and managing the team.</small></span></label></fieldset>`;
  function showCredentials(user, temp, isReset) {
    const url = `${location.origin}/admin/`;
    const invite = `Hi ${user.name.split(' ')[0]},\n\n${isReset ? 'Your JanLee CRM password has been reset.' : 'You’ve been added to the JanLee Studio CRM.'}\n\nSign in at: ${url}\nEmail: ${user.email}\nTemporary password: ${temp}\n\nYou’ll be asked to create your own password right after signing in.`;
    openModal(`<div><div class="modal-head"><h2>${isReset ? 'New temporary password' : 'Team member added'}</h2><button class="icon-btn" type="button" data-close aria-label="Close">${icon('close')}</button></div>
      <p class="modal-sub">Share these details privately (text or in person). <strong>The password is shown only once.</strong> ${esc(user.name)} will choose their own password at first sign-in.</p>
      <div class="cred"><div><small>Sign-in page</small><code>${esc(url)}</code></div></div>
      <div class="cred"><div><small>Email (username)</small><code>${esc(user.email)}</code></div><button class="btn btn-ghost btn-sm" type="button" data-copy="${esc(user.email)}">Copy</button></div>
      <div class="cred"><div><small>Temporary password</small><code class="temp-pw">${esc(temp)}</code></div><button class="btn btn-ghost btn-sm" type="button" data-copy="${esc(temp)}">Copy</button></div>
      <div class="modal-foot"><button class="btn btn-ghost" type="button" data-copy="${esc(invite)}">${icon('mail')} Copy invite message</button><button class="btn btn-primary" type="button" data-close>Done</button></div></div>`);
    $$('[data-copy]', modalBody).forEach(b => b.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(b.dataset.copy); const t = b.innerHTML; b.textContent = 'Copied ✓'; setTimeout(() => { b.innerHTML = t; }, 1500); }
      catch { toast('Couldn’t copy — select the text instead', true); }
    }));
  }
  function addUserForm() {
    if (DEMO) return toast('Adding team members works once the CRM is connected.', true);
    openModal(`<form class="form-stack" novalidate><div class="modal-head"><h2>Add team member</h2><button class="icon-btn" type="button" data-close aria-label="Close">${icon('close')}</button></div>
      <p class="modal-sub">They’ll sign in with their email and a one-time password you share with them.</p>
      <label class="field">Full name<input name="name" required maxlength="80" autocomplete="off"></label>
      <label class="field">Email address<input name="email" type="email" required maxlength="254" autocomplete="off" spellcheck="false"></label>
      ${roleChoice('staff')}
      <div class="modal-foot"><button class="btn btn-ghost" type="button" data-close>Cancel</button><button class="btn btn-primary" type="submit">${icon('plus')} Add & create password</button></div></form>`,
    async d => {
      if (!clean(d.name)) throw new Error('Please enter a name.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email || '')) throw new Error('Please enter a valid email address.');
      const j = await api('/api/users', { method: 'POST', body: { op: 'create', name: clean(d.name), email: d.email.trim(), role: d.role } });
      S.team.users.push(j.user); render(); showCredentials(j.user, j.tempPassword, false);
    });
  }
  function editUserForm(id) {
    const u = S.team?.users.find(x => x.id === id); if (!u) return;
    openModal(`<form class="form-stack" novalidate><div class="modal-head"><h2>${esc(u.name)}</h2><button class="icon-btn" type="button" data-close aria-label="Close">${icon('close')}</button></div>
      <p class="modal-sub">${esc(u.email)} · added ${fmtDate(u.created_at)}${u.created_by ? ' by ' + esc(u.created_by) : ''} · last sign-in ${ago(u.last_login_at)}</p>
      <label class="field">Full name<input name="name" required maxlength="80" value="${esc(u.name)}"></label>
      ${roleChoice(u.role)}
      <p class="field-help">Changing the role signs them out once so it takes effect.</p>
      <p class="menu-label">Access</p>
      <div class="menu">
        <button type="button" class="menu-item" data-uact="reset">${icon('key')}<span class="mi-txt"><span class="t">Reset password</span><span class="s">Creates a new temporary password and signs them out</span></span>${icon('chev', 'ic chev')}</button>
        <button type="button" class="menu-item" data-uact="toggle">${icon(u.active ? 'lock' : 'check')}<span class="mi-txt"><span class="t">${u.active ? 'Deactivate account' : 'Reactivate account'}</span><span class="s">${u.active ? 'Signs them out everywhere and blocks sign-in' : 'Lets them sign in again'}</span></span>${icon('chev', 'ic chev')}</button>
        <button type="button" class="menu-item danger" data-uact="delete">${icon('trash')}<span class="mi-txt"><span class="t">Remove from team</span></span></button>
      </div>
      <div class="modal-foot"><button class="btn btn-ghost" type="button" data-close>Cancel</button><button class="btn btn-primary" type="submit">Save changes</button></div></form>`,
    async d => {
      const patch = {};
      if (clean(d.name) && clean(d.name) !== u.name) patch.name = clean(d.name);
      if (d.role && d.role !== u.role) patch.role = d.role;
      if (!Object.keys(patch).length) return closeModal();
      const j = await api('/api/users', { method: 'POST', body: { op: 'update', id: u.id, ...patch } });
      Object.assign(u, j.user); closeModal(); toast('Team member updated'); render();
    });
    $$('[data-uact]', modalBody).forEach(b => b.addEventListener('click', async () => {
      try {
        const act = b.dataset.uact;
        if (act === 'reset') {
          if (!(await confirmBox('Reset password?', `${u.name} will be signed out and must sign in with a new temporary password.`, 'Reset password'))) return editUserForm(id);
          const j = await api('/api/users', { method: 'POST', body: { op: 'reset_password', id: u.id } });
          Object.assign(u, j.user); render(); showCredentials(u, j.tempPassword, true);
        } else if (act === 'toggle') {
          if (u.active && !(await confirmBox('Deactivate account?', `${u.name} will be signed out everywhere and won’t be able to sign in until reactivated.`, 'Deactivate'))) return editUserForm(id);
          const j = await api('/api/users', { method: 'POST', body: { op: 'update', id: u.id, active: !u.active } });
          Object.assign(u, j.user); closeModal(); toast(u.active ? 'Account reactivated' : 'Account deactivated'); render();
        } else if (act === 'delete') {
          if (!(await confirmBox('Remove from team?', `${u.name} will lose access permanently. Their notes stay in the history.`, 'Remove'))) return editUserForm(id);
          await api('/api/users', { method: 'POST', body: { op: 'delete', id: u.id } });
          S.team.users = S.team.users.filter(x => x.id !== u.id); toast('Removed from team'); render();
        }
      } catch (err) { handleErr(err); }
    }));
  }

  // ---------- notifications ----------
  async function markAllSeen() {
    if (!unread().length) return;
    const now = new Date().toISOString();
    if (DEMO) { for (const l of unread()) await update('leads', l.id, { seen_at: now }); }
    else { await api('/api/data', { method: 'POST', body: { op: 'mark_all_seen', table: 'leads', id: '00000000-0000-0000-0000-000000000000' } }); S.leads.forEach(l => { if (!l.seen_at) l.seen_at = now; }); }
    closeModal(); toast('All caught up'); render();
  }
  async function markSeen(id) {
    const l = byId('leads', id);
    if (!l || l.seen_at) return;
    try { await update('leads', id, { seen_at: new Date().toISOString() }); refreshBadges(); } catch {}
  }
  function notifSheet() {
    const news = unread(), recent = S.leads.filter(l => l.seen_at && l.source === 'website').slice(0, 5);
    const item = (l, isNew) => `<a class="notif-item${isNew ? ' is-new' : ''}" href="#/leads/${l.id}" data-close>${avatar(l.name)}<span class="grow"><span class="t">${esc(l.name)}${isNew ? ' <span class="new-chip">New</span>' : ''}</span><span class="s">${esc(l.project_type || 'Enquiry')} · ${rel(l.created_at)}</span>${emailStatus(l) ? `<span class="email-status sm">${emailStatus(l)}</span>` : ''}${l.message ? `<span class="msg">“${esc(l.message.slice(0, 110))}${l.message.length > 110 ? '…' : ''}”</span>` : ''}</span></a>`;
    openModal(`<div class="notif">
      <div class="modal-head"><h2>Notifications</h2><button class="icon-btn" type="button" data-close aria-label="Close">${icon('close')}</button></div>
      ${news.length ? `<div class="notif-bar"><span>${news.length} new request${news.length === 1 ? '' : 's'}</span><button class="linklike" type="button" data-mark-all>Mark all as read</button></div><div class="menu">${news.map(l => item(l, true)).join('')}</div>`
        : empty('check', 'You’re all caught up', 'New website requests will appear here.', 'good')}
      ${recent.length ? `<p class="menu-label">Earlier</p><div class="menu">${recent.map(l => item(l, false)).join('')}</div>` : ''}
    </div>`);
    const b = $('[data-mark-all]', modalBody); if (b) b.onclick = () => markAllSeen().catch(handleErr);
  }
  // update counters in place (no full re-render, so nothing typed is lost)
  function refreshBadges() {
    const n = unread().length;
    const label = n > 99 ? '99+' : String(n);
    $$('.side-nav a[href="#/leads"], .tabbar a[href="#/leads"]').forEach(a => {
      let b = a.querySelector('.badge');
      if (!n) { b?.remove(); return; }
      if (!b) { b = document.createElement('b'); b.className = 'badge'; a.appendChild(b); }
      b.textContent = label; b.setAttribute('aria-label', `${n} new`);
    });
    const bell = $('.bell-btn');
    if (bell) {
      bell.classList.toggle('has-new', !!n);
      bell.setAttribute('aria-label', `Notifications${n ? `, ${n} new` : ''}`);
      let b = bell.querySelector('.badge');
      if (!n) b?.remove(); else { if (!b) { b = document.createElement('b'); b.className = 'badge'; bell.appendChild(b); } b.textContent = label; }
    }
    document.title = document.title.replace(/^\(\d+\+?\)\s*/, '');
    if (n) document.title = `(${label}) ${document.title}`;
    try { n ? navigator.setAppBadge?.(n) : navigator.clearAppBadge?.(); } catch {}
  }
  // check for new website requests every minute while the CRM is open
  let pollBusy = false;
  setInterval(async () => {
    if (DEMO || pollBusy || document.hidden || !S.loaded || !auth.s) return;
    pollBusy = true;
    try {
      const before = new Set(S.leads.map(l => l.id));
      await loadAll();
      const fresh = unread().filter(l => !before.has(l.id));
      if (fresh.length) toast(fresh.length === 1 ? `New request from ${fresh[0].name}` : `${fresh.length} new requests`);
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '') || modal.open;
      if (fresh.length && !typing) render(); else refreshBadges();
    } catch {} finally { pollBusy = false; }
  }, 60000);

  // ---------- account: profile, password, sign out ----------
  const PKEY = 'jl-crm-profile';
  function profile() {
    let p = {};
    if (!DEMO) p = S.profile || {};
    else { try { p = JSON.parse(localStorage.getItem(PKEY) || '{}'); } catch {} }
    return { name: p.name || 'JanLee', title: p.title || 'Owner & Lead Designer', phone: p.phone || '(719) 930-5245' };
  }
  const acctEmail = () => (DEMO ? CFG.adminEmail : auth.s?.email || CFG.adminEmail) || '';
  function accountSheet() {
    const p = profile(), email = acctEmail();
    const item = (act, ic, label, sub = '', cls = '') => `<button type="button" class="menu-item ${cls}" data-acct="${act}">${icon(ic)}<span class="mi-txt"><span class="t">${label}</span>${sub ? `<span class="s">${sub}</span>` : ''}</span>${cls ? '' : icon('chev', 'ic chev')}</button>`;
    const link = (href, ic, label, sub = '') => `<a class="menu-item" href="${esc(href)}" target="_blank" rel="noopener">${icon(ic)}<span class="mi-txt"><span class="t">${label}</span>${sub ? `<span class="s">${sub}</span>` : ''}</span>${icon('chev', 'ic chev')}</a>`;
    openModal(`<div class="acct">
      <div class="acct-close"><button class="icon-btn" type="button" data-close aria-label="Close">${icon('close')}</button></div>
      <div class="acct-head">${avatar(p.name, 'lg')}<div><h2>${esc(p.name)}</h2><p>${esc(p.title)}</p><p class="acct-mail">${esc(email)}</p>
        <span class="status ${DEMO ? 'status-warn' : 'status-good'}">${icon(DEMO ? 'star' : 'lock')} ${esc(roleLabel())}${DEMO ? '' : ' · signed in securely'}</span></div></div>
      <p class="menu-label">Account</p>
      <div class="menu">${item('profile', 'user', 'Profile', 'Name, title and phone')}${item('password', 'key', 'Change password', 'Update your sign-in password')}${item('reset', 'mail', 'Forgot password?', 'How to reset a forgotten password')}</div>
      ${isAdmin() ? `<p class="menu-label">Admin</p><div class="menu">${item('team', 'clients', 'Team & access', 'Add users, roles and passwords')}</div>` : ''}
      <p class="menu-label">Shortcuts</p>
      <div class="menu">${isAdmin() ? item('export', 'dl', 'Export leads (CSV)', 'Opens in Excel or Google Sheets') : ''}${link('/', 'site', 'View website')}${link(IG, 'ig', 'Instagram', '@interiorsbyjanlee')}${DEMO ? item('reset-demo', 'star', 'Reset demo data', 'Restore the sample data') : ''}</div>
      ${DEMO ? '' : `<div class="menu">${item('signout-all', 'lock', 'Sign out on all devices', 'Use if a phone or laptop is lost')}</div>`}
      <div class="menu">${item('signout', 'out', 'Sign out', '', 'danger')}</div>
    </div>`);
    $$('[data-acct]', modalBody).forEach(b => b.addEventListener('click', async () => {
      const act = b.dataset.acct;
      try {
        if (act === 'profile') profileForm();
        else if (act === 'team') { closeModal(); location.hash = '#/team'; }
        else if (act === 'password') passwordForm();
        else if (act === 'reset') {
          openModal(`<div><div class="modal-head"><h2>Forgot your password?</h2><button class="icon-btn" type="button" data-close aria-label="Close">${icon('close')}</button></div>
            <p class="modal-sub">${esc(RESET_HELP)}</p><p class="modal-sub">If you still know your current password, use <strong>Change password</strong> instead.</p>
            <div class="modal-foot"><button class="btn btn-ghost" type="button" data-back>Back</button><button class="btn btn-primary" type="button" data-close>Got it</button></div></div>`);
          $('[data-back]', modalBody).onclick = accountSheet;
        }
        else if (act === 'export') { closeModal(); exportCsv(); }
        else if (act === 'reset-demo') { if (await confirmBox('Reset demo data?', 'This restores the original sample data in this browser.', 'Reset')) { demo.reset(); await loadAll(); toast('Demo data reset'); render(); } }
        else if (act === 'signout') {
          if (DEMO) return toast('There’s no account to sign out of in demo mode.', true);
          if (await confirmBox('Sign out?', 'You’ll need your password to sign back in.', 'Sign out')) { await auth.signOut(); location.hash = ''; render(); }
        }
        else if (act === 'signout-all') {
          if (await confirmBox('Sign out everywhere?', 'Every phone and computer signed in to the CRM will be signed out, including this one.', 'Sign out everywhere')) {
            await api('/api/auth', { method: 'POST', body: { op: 'logout_all' } }); auth.s = null; closeModal(); location.hash = ''; render();
          }
        }
      } catch (err) { handleErr(err); }
    }));
  }
  function profileForm() {
    const p = profile();
    openModal(`<form class="form-stack"><div class="modal-head"><h2>Profile</h2><button class="icon-btn" type="button" data-close aria-label="Close">${icon('close')}</button></div>
      <p class="modal-sub">How you appear in the CRM.</p>
      <label class="field">Display name<input name="name" required maxlength="60" value="${esc(p.name)}"></label>
      <label class="field">Title<input name="title" maxlength="80" value="${esc(p.title)}"></label>
      <label class="field">Business phone<input name="phone" type="tel" maxlength="30" value="${esc(p.phone)}"></label>
      <label class="field">Sign-in email <small>(used to sign in and for reset links)</small><input value="${esc(acctEmail())}" disabled></label>
      <div class="modal-foot"><button class="btn btn-ghost" type="button" data-back>Back</button><button class="btn btn-primary" type="submit">Save profile</button></div></form>`,
    async d => {
      if (!clean(d.name)) throw new Error('Please enter a display name.');
      const p = { name: clean(d.name), title: clean(d.title), phone: clean(d.phone) };
      if (DEMO) { try { localStorage.setItem(PKEY, JSON.stringify(p)); } catch {} }
      else S.profile = (await api('/api/auth', { method: 'POST', body: { op: 'profile', ...p } })).profile;
      closeModal(); toast('Profile saved'); render();
    });
    $('[data-back]', modalBody).onclick = accountSheet;
  }
  function passwordForm() {
    openModal(`<form class="form-stack" novalidate><div class="modal-head"><h2>Change password</h2><button class="icon-btn" type="button" data-close aria-label="Close">${icon('close')}</button></div>
      <p class="modal-sub">Use at least 12 characters — a short phrase is easiest to remember.</p>
      <label class="field">Current password<input name="cur" type="password" autocomplete="current-password" required></label>
      <label class="field">New password<input name="p1" type="password" autocomplete="new-password" required minlength="12"></label>
      <div class="pw-meter" data-score="0" aria-hidden="true"><i></i><i></i><i></i><i></i></div><p class="pw-hint" aria-live="polite"></p>
      <label class="field">Confirm new password<input name="p2" type="password" autocomplete="new-password" required minlength="12"></label>
      <div class="modal-foot"><button class="btn btn-ghost" type="button" data-back>Back</button><button class="btn btn-primary" type="submit">Update password</button></div></form>`,
    async d => {
      if (DEMO) throw new Error('Password changes work once the CRM is connected.');
      if (!d.cur) throw new Error('Enter your current password.');
      if (d.p1.length < 12) throw new Error('New password must be at least 12 characters.');
      if (d.p1 !== d.p2) throw new Error('New passwords don’t match.');
      if (d.p1 === d.cur) throw new Error('Choose a password different from your current one.');
      await auth.changePassword(d.cur, d.p1);
      closeModal(); toast('Password updated');
    });
    const f = $('form', modalBody), meterBox = $('.pw-meter', f), hint = $('.pw-hint', f);
    f.p1.addEventListener('input', () => {
      const v = f.p1.value;
      const score = v.length < 12 ? (v ? 1 : 0) : [true, /[a-z]/.test(v) && /[A-Z]/.test(v), /\d/.test(v), /[^A-Za-z0-9]/.test(v) || v.length >= 16].filter(Boolean).length;
      meterBox.dataset.score = score;
      hint.textContent = v ? ['', v.length < 12 ? 'Too short — at least 12 characters' : 'Weak', 'Fair', 'Good', 'Strong'][score] : '';
    });
    $('[data-back]', modalBody).onclick = accountSheet;
  }
  function lostForm(l) {
    openModal(`<form class="form-stack"><div class="modal-head"><h2>Mark as lost</h2><button class="icon-btn" type="button" data-close aria-label="Close">${icon('close')}</button></div>
      <p class="modal-sub">${esc(l.name)} will move to <strong>Lost</strong>. You can reopen the lead anytime.</p>
      <label class="field">Reason <small>(optional — helps spot patterns)</small><input name="reason" maxlength="300" placeholder="e.g. Chose another designer, budget, timing"></label>
      <div class="modal-foot"><button class="btn btn-ghost" type="button" data-close>Cancel</button><button class="btn btn-danger" type="submit">Mark as lost</button></div></form>`,
    async d => { await update('leads', l.id, { lost_reason: clean(d.reason) }); closeModal(); await changeStage(l.id, 'lost'); });
  }
  async function changeStage(id, stage) {
    const l = byId('leads', id); if (!l || l.stage === stage) return;
    await log(`Stage changed: ${stageLabel(l.stage)} → ${stageLabel(stage)}`, { lead_id: id }, 'stage');
    await update('leads', id, { stage, ...(stage === 'won' || stage === 'lost' ? { next_follow_up: null } : {}), ...(stage !== 'lost' && l.lost_reason ? { lost_reason: null } : {}) });
    toast(`Moved to ${stageLabel(stage)}`); render();
    if (stage === 'won' && !l.client_id) convertForm(byId('leads', id));
  }
  // drag & drop on the pipeline (mouse/trackpad); phones use the stage selector on the lead page
  app.addEventListener('dragstart', e => { const c = e.target.closest('[data-lead]'); if (!c) return; e.dataTransfer.setData('text/plain', c.dataset.lead); e.dataTransfer.effectAllowed = 'move'; c.classList.add('is-dragging'); });
  app.addEventListener('dragend', e => { e.target.closest?.('[data-lead]')?.classList.remove('is-dragging'); $$('.col.is-over').forEach(c => c.classList.remove('is-over')); });
  app.addEventListener('dragover', e => { const col = e.target.closest('[data-drop]'); if (!col) return; e.preventDefault(); $$('.col.is-over').forEach(c => c !== col && c.classList.remove('is-over')); col.classList.add('is-over'); });
  app.addEventListener('drop', async e => { const col = e.target.closest('[data-drop]'); if (!col) return; e.preventDefault(); col.classList.remove('is-over'); try { await changeStage(e.dataTransfer.getData('text/plain'), col.dataset.drop); } catch (err) { handleErr(err); } });

  function exportCsv() {
    const cols = ['created_at', 'name', 'email', 'phone', 'zip', 'project_type', 'source', 'stage', 'value', 'next_follow_up', 'message'];
    // prefix formula-like cells so spreadsheets don't execute them (CSV injection)
    const cell = v => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };
    const csv = [cols.join(','), ...S.leads.map(l => cols.map(c => cell(l[c])).join(','))].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `janlee-leads-${today()}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(`Exported ${S.leads.length} leads`);
  }
  function handleErr(err) {
    console.error(err);
    if (err && err.message === 'signed_out') { toast('Your session ended — please sign in again.', true); render(); return; }
    toast(err?.message || 'Something went wrong', true);
  }

  // ---------- auth views ----------
  const brand = `<div class="brand">${MARK}<span class="brand-sub">Interiors by</span><span class="brand-name">JanLee</span><span class="brand-tag">Studio CRM</span></div>`;
  const FEATURES = [
    ['leads', 'Every enquiry, captured', 'Website requests arrive in your pipeline automatically.'],
    ['bell', 'Never miss a follow-up', 'Tasks and reminders for what’s due today.'],
    ['projects', 'Clients & projects', 'Budgets, timelines and history in one place.'],
    ['lock', 'Private & secure', 'Encrypted sign-in and private file storage.'],
  ];
  const authWrap = (inner, { features = true } = {}) => `<div class="auth">
    <aside class="auth-photo"><img src="/assets/img/projects/emerald-and-indigo-mosaic-bath/cover-lg.webp" alt="" width="1600" height="1066">
      <div class="auth-photo-in">
        <a class="auth-site" href="/">${MARK}<span><small>Interiors by</small>JanLee</span></a>
        <div class="auth-pitch"><p class="eyebrow">Studio CRM</p><h2>Your studio, beautifully organized.</h2>
          ${features ? `<ul class="auth-features">${FEATURES.map(([ic, t, d]) => `<li><span class="af-ic">${icon(ic)}</span><span><strong>${t}</strong><small>${d}</small></span></li>`).join('')}</ul>` : ''}
        </div>
        <p class="auth-quote">“Restoring the old while embracing the new.”</p>
      </div></aside>
    <div class="auth-side">${inner}</div></div>`;
  const authFoot = `<div class="auth-foot"><span>${icon('lock')} Encrypted connection · private to Interiors by JanLee</span><a href="/">${icon('back')} Back to website</a></div>`;
  const pwToggle = name => `<button class="pw-eye" type="button" data-eye="${name}" aria-label="Show password" aria-pressed="false">${icon('eye')}</button>`;
  function wireEyes(root) {
    $$('[data-eye]', root).forEach(b => b.addEventListener('click', () => {
      const inp = root.elements[b.dataset.eye], show = inp.type === 'password';
      inp.type = show ? 'text' : 'password'; b.setAttribute('aria-pressed', String(show)); b.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      b.innerHTML = icon(show ? 'eyeoff' : 'eye'); inp.focus();
    }));
  }
  function capsWarn(input, el) {
    const f = e => { el.hidden = !(e.getModifierState && e.getModifierState('CapsLock')); };
    input.addEventListener('keydown', f); input.addEventListener('keyup', f); input.addEventListener('blur', () => { el.hidden = true; });
  }
  function vLogin(msg = '', ok = false) {
    const h = new Date().getHours(), hello = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    app.innerHTML = authWrap(`<form class="auth-card form-stack" id="login" novalidate>${brand}
      <div><h1 class="auth-title">${hello}</h1><p class="auth-lead">Sign in to manage leads, clients and projects.</p></div>
      <label class="field"><span class="lbl-row">Email address <small>your username</small></span>
        <span class="input-ic">${icon('mail')}<input name="email" type="email" inputmode="email" autocomplete="username" spellcheck="false" required value="${esc(CFG.adminEmail || '')}"></span></label>
      <label class="field">Password
        <span class="input-ic">${icon('key')}<input name="password" type="password" autocomplete="current-password" required>${pwToggle('password')}</span></label>
      <p class="caps" hidden>${icon('alert')} Caps Lock is on</p>
      <div class="auth-row"><label class="check-row"><input type="checkbox" name="remember" checked> Keep me signed in</label><button class="linklike" type="button" id="forgot">Forgot password?</button></div>
      <p class="auth-msg ${ok ? 'ok' : 'err'}" role="alert">${esc(msg)}</p>
      <button class="btn btn-primary btn-block btn-lg" type="submit"><span class="btn-label">Sign in</span>${icon('arrowR')}</button>
      <div class="auth-note">${icon('star')}<p><strong>First time signing in?</strong> Use the temporary password from your web admin. You’ll create your own password right after.</p></div>
      ${authFoot}</form>`);
    const f = $('#login'), m = $('.auth-msg', f), btn = $('button[type=submit]', f);
    wireEyes(f); capsWarn(f.password, $('.caps', f));
    setTimeout(() => (f.email.value ? f.password : f.email).focus(), 50);
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const email = f.email.value.trim(), password = f.password.value;
      if (!email || !password) { m.className = 'auth-msg err'; m.textContent = 'Enter your email and password.'; (email ? f.password : f.email).focus(); return; }
      btn.disabled = true; btn.classList.add('is-busy'); $('.btn-label', btn).textContent = 'Signing in…'; m.textContent = '';
      try { await auth.signIn(email, password, f.remember.checked); await boot(); return; }
      catch (err) {
        m.className = 'auth-msg err'; m.textContent = err.message;
        f.password.value = ''; f.password.focus();
        f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake');
      }
      btn.disabled = false; btn.classList.remove('is-busy'); $('.btn-label', btn).textContent = 'Sign in';
    });
    $('#forgot').onclick = () => { m.className = 'auth-msg ok'; m.textContent = RESET_HELP; };
  }
  function pwScore(v) {
    const checks = [v.length >= 12, /[a-z]/.test(v) && /[A-Z]/.test(v), /\d/.test(v), /[^A-Za-z0-9]/.test(v) || v.length >= 16];
    return { checks, score: v.length < 12 ? (v ? 1 : 0) : checks.filter(Boolean).length };
  }
  function vFirstPassword() {
    app.innerHTML = authWrap(`<form class="auth-card form-stack" id="firstpw" novalidate>${brand}
      <div><p class="eyebrow">Step 2 of 2</p><h1 class="auth-title">Create your password</h1><p class="auth-lead">You signed in with a temporary password. Choose your own to open your dashboard — it replaces the temporary one.</p></div>
      <label class="field">New password<span class="input-ic">${icon('key')}<input name="p1" type="password" autocomplete="new-password" required minlength="12">${pwToggle('p1')}</span></label>
      <div class="pw-meter" data-score="0" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <ul class="pw-rules" aria-live="polite">
        <li data-rule="0">${icon('check')} At least 12 characters</li><li data-rule="1">${icon('check')} Upper & lower case letters</li>
        <li data-rule="2">${icon('check')} At least one number</li><li data-rule="3">${icon('check')} A symbol (or 16+ characters)</li></ul>
      <label class="field">Confirm password<span class="input-ic">${icon('key')}<input name="p2" type="password" autocomplete="new-password" required minlength="12">${pwToggle('p2')}</span></label>
      <p class="caps" hidden>${icon('alert')} Caps Lock is on</p>
      <p class="auth-msg err" role="alert"></p>
      <button class="btn btn-primary btn-block btn-lg" type="submit"><span class="btn-label">Save & open dashboard</span>${icon('arrowR')}</button>
      <p class="auth-alt"><button class="linklike" type="button" id="cancel-first">Cancel and sign out</button></p>
      ${authFoot}</form>`, { features: false });
    const f = $('#firstpw'), m = $('.auth-msg', f), btn = $('button[type=submit]', f), meter = $('.pw-meter', f);
    wireEyes(f); capsWarn(f.p1, $('.caps', f));
    setTimeout(() => f.p1.focus(), 50);
    f.p1.addEventListener('input', () => {
      const { checks, score } = pwScore(f.p1.value);
      meter.dataset.score = score;
      $$('[data-rule]', f).forEach(li => li.classList.toggle('ok', checks[+li.dataset.rule]));
    });
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const a = f.p1.value, b = f.p2.value, { score } = pwScore(a);
      if (a.length < 12) { m.textContent = 'Use at least 12 characters.'; return f.p1.focus(); }
      if (score < 3) { m.textContent = 'Make it a little stronger — tick at least three of the boxes above.'; return f.p1.focus(); }
      if (a !== b) { m.textContent = 'Passwords don’t match.'; return f.p2.focus(); }
      btn.disabled = true; $('.btn-label', btn).textContent = 'Saving…'; m.textContent = '';
      try { await api('/api/auth', { method: 'POST', body: { op: 'password', next: a } }); toast('Password created — welcome!'); await boot(); return; }
      catch (err) { if (err.code === 'signed_out') return vLogin('Your temporary sign-in expired. Please sign in again.'); m.textContent = err.message; }
      btn.disabled = false; $('.btn-label', btn).textContent = 'Save & open dashboard';
    });
    $('#cancel-first').onclick = async () => { await auth.signOut(); vLogin('Signed out.', true); };
  }
  // ---------- router ----------
  function route() {
    const [path, qs] = (location.hash.slice(2) || 'dashboard').split('?');
    const [name, id] = path.split('/');
    return { name, id, params: new URLSearchParams(qs || '') };
  }
  let renderedKey = '', enterAnim = false;
  function render() {
    if (!DEMO && !auth.s) return vLogin('You’ve been signed out.', true);
    if (!S.loaded) { app.innerHTML = '<div class="skel-wrap" aria-label="Loading"><div class="skel h1"></div><div class="skel-row"><div class="skel"></div><div class="skel"></div><div class="skel"></div><div class="skel"></div></div><div class="skel big"></div></div>'; return; }
    const r = route();
    const views = { dashboard: vDashboard, leads: () => (r.id ? vLead(r.id) : vLeads(r.params)), tasks: vTasks, clients: () => (r.id ? vClient(r.id) : vClients()), projects: vProjects, team: vTeam };
    const view = views[r.name] || vDashboard;
    const active = views[r.name] ? r.name : 'dashboard';
    // play the entrance fade only when the page changes, not on data refreshes
    const key = active + '/' + (r.id || '');
    enterAnim = key !== renderedKey; renderedKey = key;
    app.innerHTML = shell(active, view());
    document.title = `${{ dashboard: 'Dashboard', leads: r.id ? byId('leads', r.id)?.name || 'Lead' : 'Leads', tasks: 'Tasks', clients: r.id ? byId('clients', r.id)?.name || 'Client' : 'Clients', projects: 'Projects', team: 'Team & access' }[active]} · JanLee CRM`;
    refreshBadges();
    if (active === 'leads' && r.id) markSeen(r.id); // opening a request marks it as read
  }
  let lastRoute = '';
  addEventListener('hashchange', () => { if (route().name === 'team') S.team = null; const k = route().name + '/' + (route().id || ''); render(); if (k !== lastRoute) { scrollTo(0, 0); lastRoute = k; } });

  function vSetup(missing) {
    app.innerHTML = authWrap(`<div class="auth-card form-stack">${brand}
      <div><h1 class="auth-title">Almost ready</h1><p class="auth-lead">The CRM is installed but a few settings still need to be added in Vercel → Settings → Environment Variables:</p></div>
      <ul class="setup-list">${missing.map(k => `<li>${icon('key')} <code>${esc(k)}</code></li>`).join('')}</ul>
      <p class="auth-lead">After adding them, redeploy the project and reload this page.</p>${authFoot}</div>`);
  }
  async function boot() {
    const m = await auth.me();
    if (!m) DEMO = true;                                   // no API here (local preview) → demo
    else if (!m.configured) return vSetup(m.missing || []);
    else { DEMO = false; if (!m.authenticated) return vLogin(); if (m.mustChange) return vFirstPassword(); auth.s = { email: m.email }; S.me = { email: m.email, role: m.role || 'admin', owner: !!m.owner }; S.profile = m.profile || null; S.filesReady = m.files !== false; }
    app.innerHTML = '<div class="skel-wrap" aria-label="Loading"><div class="skel h1"></div><div class="skel-row"><div class="skel"></div><div class="skel"></div><div class="skel"></div><div class="skel"></div></div><div class="skel big"></div></div>';
    try { await loadAll(); render(); }
    catch (err) { if (err.message === 'signed_out') vLogin('Please sign in again.'); else { app.innerHTML = authWrap(`<div class="auth-card form-stack">${brand}<p class="auth-msg err">Couldn’t load your data: ${esc(err.message)}</p><button class="btn btn-ghost btn-block" type="button" id="retry">Try again</button></div>`); $('#retry').onclick = boot; } }
  }
  // refresh data when returning to the tab (e.g. a new website enquiry arrived)
  document.addEventListener('visibilitychange', async () => { if (!document.hidden && S.loaded && (DEMO || auth.s) && !modal.open) { try { await loadAll(); render(); } catch {} } });
  boot();
})();
