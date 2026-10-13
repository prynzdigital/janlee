/* JanLee CRM — single-page admin (no dependencies).
   Data: Supabase (Postgres + Auth) via its REST API, protected by Row Level Security.
   Without config it runs in DEMO mode on sample data kept in this browser only. */
(() => {
  'use strict';
  const CFG = window.CRM_CONFIG || {};
  const DEMO = !CFG.supabaseUrl || !CFG.supabaseAnonKey;
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
  const initials = n => { const w = String(n || '?').split(/\s+/).filter(Boolean); return ((w[0] || '?')[0] + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase(); };
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

  // ---------- auth (Supabase GoTrue REST) ----------
  const SKEY = 'jl-crm-session';
  const auth = {
    s: (() => { try { return JSON.parse(localStorage.getItem(SKEY) || 'null'); } catch { return null; } })(),
    save(s) { this.s = s; try { s ? localStorage.setItem(SKEY, JSON.stringify(s)) : localStorage.removeItem(SKEY); } catch {} },
    async call(path, body, token) {
      const r = await fetch(`${CFG.supabaseUrl}/auth/v1/${path}`, {
        method: body === undefined ? 'GET' : (path === 'user' ? 'PUT' : 'POST'),
        headers: { apikey: CFG.supabaseAnonKey, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error_description || j.msg || j.message || 'Sign-in failed');
      return j;
    },
    store(j) { this.save({ access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + (j.expires_in || 3600) * 1000, email: j.user?.email }); },
    async signIn(email, password) {
      const j = await this.call('token?grant_type=password', { email, password });
      if (CFG.adminEmail && String(j.user?.email).toLowerCase() !== CFG.adminEmail.toLowerCase()) throw new Error('This account does not have access.');
      this.store(j);
    },
    async token() {
      if (!this.s) throw new Error('signed_out');
      if (Date.now() > this.s.expires_at - 60e3) {
        try { this.store(await this.call('token?grant_type=refresh_token', { refresh_token: this.s.refresh_token })); }
        catch { this.save(null); throw new Error('signed_out'); }
      }
      return this.s.access_token;
    },
    async signOut() { try { if (this.s) await this.call('logout', {}, this.s.access_token); } catch {} this.save(null); },
    recover: email => auth.call('recover', { email, redirect_to: `${location.origin}/admin/` }),
  };

  // ---------- data layer ----------
  const TABLES = ['leads', 'clients', 'projects', 'activities', 'tasks'];
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  const rest = {
    async req(path, init = {}) {
      const token = await auth.token();
      const r = await fetch(`${CFG.supabaseUrl}/rest/v1/${path}`, {
        ...init, headers: { apikey: CFG.supabaseAnonKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(init.headers || {}) },
      });
      if (r.status === 401) { auth.save(null); throw new Error('signed_out'); }
      const j = r.status === 204 ? null : await r.json().catch(() => null);
      if (!r.ok) throw new Error(j?.message || `Request failed (${r.status})`);
      return j;
    },
    all: t => rest.req(`${t}?select=*&order=created_at.desc&limit=5000`),
    insert: async (t, row) => (await rest.req(t, { method: 'POST', body: JSON.stringify(row) }))[0],
    update: async (t, id, patch) => (await rest.req(`${t}?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) }))[0],
    remove: (t, id) => rest.req(`${t}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }),
  };
  const DKEY = 'jl-crm-demo-v1';
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
  const db = DEMO ? demo : rest;
  const S = { leads: [], clients: [], projects: [], activities: [], tasks: [], loaded: false };
  async function loadAll() { const res = await Promise.all(TABLES.map(t => db.all(t))); TABLES.forEach((t, i) => { S[t] = res[i] || []; }); S.loaded = true; }
  async function insert(t, row) { const r = await db.insert(t, row); S[t].unshift(r); return r; }
  async function update(t, id, patch) { const r = await db.update(t, id, patch); const i = S[t].findIndex(x => x.id === id); if (i > -1) S[t][i] = { ...S[t][i], ...r }; return S[t][i]; }
  async function remove(t, id) { await db.remove(t, id); if (!DEMO) await loadAll(); else TABLES.forEach(x => { S[x] = demo.data[x].slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1)); }); }
  const log = (body, ref, kind = 'note') => insert('activities', { kind, body, ...ref });
  const byId = (t, id) => S[t].find(x => x.id === id);

  // ---------- demo seed (relative to today so the dashboard looks alive) ----------
  function seed() {
    const now = new Date(), ago = d => new Date(now - d * 864e5).toISOString(), inDays = d => addDays(today(), d);
    const L = (name, d, stage, type, value, src = 'website', fu = null, msg = '') => ({
      id: uid(), created_at: ago(d), updated_at: ago(Math.max(0, d - 2)), name, email: name.toLowerCase().replace(/[^a-z]+/g, '.') + '@example.com',
      phone: `(719) 555-0${String(100 + Math.floor(d * 7) % 900).padStart(3, '0')}`, zip: '80903', project_type: type, source: src, stage, value, next_follow_up: fu,
      message: msg || `Hello JanLee — we'd love help with a ${type.toLowerCase()}. Looking to start in the next few months.`, lost_reason: stage === 'lost' ? 'Went with a lower budget option' : null, client_id: null,
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
  const NAV = [['dashboard', 'Dashboard', 'dash'], ['leads', 'Leads', 'leads'], ['tasks', 'Tasks', 'tasks'], ['clients', 'Clients', 'clients'], ['projects', 'Projects', 'projects']];
  function shell(route, inner) {
    const due = dueCount();
    const link = ([id, label, ic]) => `<a href="#/${id}"${route === id ? ' aria-current="page"' : ''}>${icon(ic)}<span>${label}</span>${id === 'tasks' && due ? `<b class="badge" aria-label="${due} due">${due}</b>` : ''}</a>`;
    return `<div class="shell">
      <nav class="sidenav" aria-label="CRM">
        <div class="side-brand"><span>Interiors by</span><strong>JanLee</strong><em>Studio CRM</em></div>
        ${NAV.map(link).join('')}
        <div class="side-foot">
          <a href="#" data-action="export">${icon('dl')} Export leads (CSV)</a>
          <a href="/" target="_blank" rel="noopener">${icon('site')} View website</a>
          <a href="${esc(IG)}" target="_blank" rel="noopener">${icon('ig')} Instagram</a>
          ${DEMO ? `<a href="#" data-action="reset-demo">${icon('star')} Reset demo data</a>` : `<a href="#" data-action="signout">${icon('out')} Sign out</a>`}
          <span>${DEMO ? 'Demo mode' : esc(auth.s?.email || '')}</span>
        </div>
      </nav>
      <div>
        ${DEMO ? '<div class="demo-banner"><strong>Demo mode</strong> — sample data stored only in this browser. Connect Supabase to use real data.</div>' : ''}
        <header class="topbar"><a class="mini-brand" href="#/dashboard"><span>Interiors by</span>JanLee</a>
          <a class="icon-btn" href="${esc(IG)}" target="_blank" rel="noopener" aria-label="Instagram (opens in a new tab)">${icon('ig')}</a>
          <button class="btn btn-primary btn-sm" type="button" data-action="new-lead">${icon('plus')} Lead</button>
          <button class="icon-btn" type="button" data-action="${DEMO ? 'reset-demo' : 'signout'}" aria-label="${DEMO ? 'Reset demo data' : 'Sign out'}">${icon(DEMO ? 'star' : 'out')}</button>
        </header>
        <main class="main" id="main">${inner}</main>
      </div>
      <nav class="tabbar" aria-label="CRM">${NAV.map(link).join('')}</nav>
    </div>`;
  }

  function vDashboard() {
    const now = new Date(), mk = monthKey(now), prev = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const thisM = S.leads.filter(l => monthKey(new Date(l.created_at)) === mk).length;
    const lastM = S.leads.filter(l => monthKey(new Date(l.created_at)) === prev).length;
    const delta = thisM - lastM;
    const open = S.leads.filter(l => OPEN.includes(l.stage));
    const openVal = open.reduce((s, l) => s + (Number(l.value) || 0), 0);
    const won = S.leads.filter(l => l.stage === 'won').length, lost = S.leads.filter(l => l.stage === 'lost').length;
    const rate = won + lost ? Math.round((won / (won + lost)) * 100) : 0;
    const active = S.projects.filter(p => p.status !== 'completed').length;
    const t = today();
    const dueTasks = openTasks().filter(x => x.due_date && x.due_date <= t).sort((a, b) => (a.due_date < b.due_date ? -1 : 1));
    const dueFollow = open.filter(l => l.next_follow_up && l.next_follow_up <= t).sort((a, b) => (a.next_follow_up < b.next_follow_up ? -1 : 1));
    const months = [...Array(6)].map((_, i) => { const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1); return { k: monthKey(d), label: MON[d.getMonth()] }; });
    const perMonth = months.map(m => ({ label: m.label, value: S.leads.filter(l => monthKey(new Date(l.created_at)) === m.k).length }));
    const stageRows = STAGES.filter(s => s.id !== 'lost').map(s => {
      const ls = S.leads.filter(l => l.stage === s.id), v = ls.reduce((a, l) => a + (Number(l.value) || 0), 0);
      return { label: s.label, value: ls.length, display: `${ls.length}`, tip: `${s.label}: ${ls.length} lead${ls.length === 1 ? '' : 's'} · ${money(v)}` };
    });
    const typeRows = PTYPES.map(p => ({ label: p, value: S.leads.filter(l => l.project_type === p).length })).filter(r => r.value).sort((a, b) => b.value - a.value).slice(0, 6);
    const hello = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
    return `<div class="page-head"><div><h1>${hello}, JanLee</h1><p>${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p></div>
      <div class="head-actions"><button class="btn btn-ghost" type="button" data-action="new-task">${icon('plus')} Task</button><button class="btn btn-primary" type="button" data-action="new-lead">${icon('plus')} New lead</button></div></div>
    <section class="stats" aria-label="Key numbers">
      <div class="stat-tile hero-tile"><div class="stat-label">New leads this month</div><div class="stat-value">${thisM}</div>
        <div class="stat-delta">${delta === 0 ? 'Same as last month' : `${delta > 0 ? '+' : '−'}${Math.abs(delta)} vs last month (${lastM})`}</div></div>
      <div class="stat-tile"><div class="stat-label">Open pipeline</div><div class="stat-value">${compact(openVal)}</div><div class="stat-delta">${open.length} open lead${open.length === 1 ? '' : 's'}</div></div>
      <div class="stat-tile"><div class="stat-label">Win rate</div><div class="stat-value">${rate}%</div><div class="stat-delta">${won} won · ${lost} lost</div></div>
      <div class="stat-tile"><div class="stat-label">Active projects</div><div class="stat-value">${active}</div><div class="stat-delta">${S.clients.length} client${S.clients.length === 1 ? '' : 's'}</div></div>
    </section>
    <div class="dash-grid">
      <section class="card" aria-labelledby="h-today">
        <div class="card-head"><div><h2 id="h-today">Needs attention</h2><p>Overdue and due today</p></div><a class="linklike" href="#/tasks">All tasks</a></div>
        <div class="today-list">
          ${dueFollow.map(l => `<a class="today-item row" href="#/leads/${l.id}"><span class="avatar">${esc(initials(l.name))}</span><span class="grow"><span class="t">Follow up: ${esc(l.name)}</span><span class="s">${esc(stageLabel(l.stage))} · ${esc(l.project_type || '')}</span></span>${dueBadge(l.next_follow_up)}</a>`).join('')}
          ${dueTasks.map(x => `<label class="today-item"><input type="checkbox" data-task-done="${x.id}" aria-label="Mark done: ${esc(x.title)}"><span class="grow"><span class="t">${esc(x.title)}</span><span class="s">${esc(refName(x))}</span></span>${dueBadge(x.due_date)}</label>`).join('')}
          ${dueFollow.length + dueTasks.length ? '' : `<p class="empty">${icon('check')} You're all caught up.</p>`}
        </div>
      </section>
      <section class="card" aria-labelledby="h-month"><div class="card-head"><div><h2 id="h-month">New leads per month</h2><p>Last 6 months</p></div></div>${columnChart(perMonth, { unit: 'Leads', label: 'New leads per month, last 6 months' })}</section>
      <section class="card" aria-labelledby="h-stage"><div class="card-head"><div><h2 id="h-stage">Leads by stage</h2><p>Hover a bar for pipeline value</p></div><a class="linklike" href="#/leads">Open pipeline</a></div>${barChart(stageRows, { unit: 'Leads', label: 'Number of leads in each stage' })}</section>
      <section class="card" aria-labelledby="h-type"><div class="card-head"><div><h2 id="h-type">What clients ask for</h2><p>Leads by project type</p></div></div>${typeRows.length ? barChart(typeRows, { unit: 'Leads', label: 'Leads by project type' }) : '<p class="empty">No leads yet.</p>'}</section>
      <section class="card span-2" aria-labelledby="h-recent"><div class="card-head"><div><h2 id="h-recent">Latest leads</h2></div><a class="linklike" href="#/leads?view=list">See all</a></div>
        <div>${S.leads.slice(0, 5).map(leadRow).join('') || '<p class="empty">No leads yet. Website enquiries will appear here automatically.</p>'}</div></section>
    </div>`;
  }
  const leadRow = l => `<a class="row" href="#/leads/${l.id}"><span class="avatar">${esc(initials(l.name))}</span>
    <span class="grow"><span class="t">${esc(l.name)}</span><span class="s">${esc(l.project_type || '—')} · ${esc(srcLabel(l.source))} · ${rel(l.created_at)}</span></span>
    <span class="r"><span class="stage-pill stage-${l.stage}">${esc(stageLabel(l.stage))}</span><br><small>${l.value ? money(l.value) : ''}</small></span></a>`;

  let leadView = 'board', leadQuery = '', leadStage = 'all';
  function vLeads(params) {
    if (params.get('view')) leadView = params.get('view');
    const q = leadQuery.toLowerCase();
    const match = l => !q || [l.name, l.email, l.phone, l.project_type, l.message].some(v => String(v || '').toLowerCase().includes(q));
    const list = S.leads.filter(match);
    const head = `<div class="page-head"><div><h1>Leads</h1><p>${S.leads.filter(l => OPEN.includes(l.stage)).length} open · ${money(S.leads.filter(l => OPEN.includes(l.stage)).reduce((s, l) => s + (Number(l.value) || 0), 0))} in pipeline</p></div>
      <div class="head-actions"><button class="btn btn-primary" type="button" data-action="new-lead">${icon('plus')} New lead</button></div></div>
      <div class="toolbar"><input class="input" type="search" placeholder="Search name, email, phone, project…" value="${esc(leadQuery)}" data-search="leads" aria-label="Search leads">
        <div class="seg" role="group" aria-label="View"><button type="button" data-leadview="board" aria-pressed="${leadView === 'board'}">Pipeline</button><button type="button" data-leadview="list" aria-pressed="${leadView === 'list'}">List</button></div></div>`;
    if (leadView === 'board') {
      const fine = matchMedia('(pointer: fine)').matches;
      return head + `<div class="board">${STAGES.map(s => {
        const ls = list.filter(l => l.stage === s.id), v = ls.reduce((a, l) => a + (Number(l.value) || 0), 0);
        return `<section class="col" data-drop="${s.id}" aria-label="${s.label}"><div class="col-head"><h2>${s.label}</h2><span>${ls.length}${v ? ' · ' + compact(v) : ''}</span></div>
          ${ls.map(l => `<a class="lead-card" href="#/leads/${l.id}" data-lead="${l.id}"${fine ? ' draggable="true"' : ''}>
            <span class="n">${esc(l.name)}</span><span class="m">${esc(l.project_type || '—')}</span>
            <span class="m">${l.value ? `<span class="v">${money(l.value)}</span>` : ''}${OPEN.includes(l.stage) ? dueBadge(l.next_follow_up) : ''}<span>${rel(l.created_at)}</span></span></a>`).join('') || '<p class="empty">—</p>'}
        </section>`;
      }).join('')}</div>`;
    }
    const counts = Object.fromEntries(STAGES.map(s => [s.id, list.filter(l => l.stage === s.id).length]));
    const shown = list.filter(l => leadStage === 'all' || l.stage === leadStage);
    return head + `<div class="chips" role="group" aria-label="Filter by stage"><button class="chip" type="button" data-stagefilter="all" aria-pressed="${leadStage === 'all'}">All<span>${list.length}</span></button>
      ${STAGES.map(s => `<button class="chip" type="button" data-stagefilter="${s.id}" aria-pressed="${leadStage === s.id}">${s.label}<span>${counts[s.id]}</span></button>`).join('')}</div>
      <div class="list">${shown.map(leadRow).join('') || '<p class="empty">No leads match.</p>'}</div>`;
  }

  function timeline(ref) {
    const key = Object.keys(ref)[0], items = S.activities.filter(a => a[key] === ref[key]);
    const ic = { note: 'note', call: 'phone', email: 'mail', meeting: 'meet', stage: 'stage' };
    return `<form class="note-form" data-note='${esc(JSON.stringify(ref))}'>
        <label class="sr" for="note-body">Add a note</label><textarea class="input" id="note-body" name="body" rows="3" maxlength="5000" placeholder="Add a note, call summary or next step…" required></textarea>
        <div class="row-btns"><select class="input" name="kind" aria-label="Type">${opts(KINDS, 'note')}</select><button class="btn btn-primary btn-sm" type="submit">Add to history</button></div></form>
      <div class="timeline">${items.map(a => `<div class="tl"><span class="dot">${icon(ic[a.kind] || 'note')}</span><div><div class="body">${esc(a.body)}</div><div class="when">${esc((KINDS.find(k => k[0] === a.kind) || ['', a.kind === 'stage' ? 'Update' : 'Note'])[1])} · ${rel(a.created_at)}</div></div></div>`).join('') || '<p class="empty">No history yet.</p>'}</div>`;
  }
  function taskList(ref) {
    const key = Object.keys(ref)[0], items = S.tasks.filter(t => t[key] === ref[key]).sort((a, b) => (a.done - b.done) || String(a.due_date || '9').localeCompare(String(b.due_date || '9')));
    return `<form class="add-inline" data-addtask='${esc(JSON.stringify(ref))}'><input class="input" name="title" maxlength="200" placeholder="New task…" required aria-label="Task"><input class="input" type="date" name="due_date" aria-label="Due date"><button class="btn btn-ghost btn-sm" type="submit">${icon('plus')} Add</button></form>
      ${items.map(taskItem).join('') || '<p class="empty">No tasks.</p>'}`;
  }
  const taskItem = x => `<div class="task${x.done ? ' is-done' : ''}"><input type="checkbox" data-task-done="${x.id}" ${x.done ? 'checked' : ''} aria-label="${x.done ? 'Mark not done' : 'Mark done'}: ${esc(x.title)}">
    <div class="grow"><div class="t">${esc(x.title)}</div><div class="s">${x.done ? `<span>Done ${x.completed_at ? rel(x.completed_at) : ''}</span>` : dueBadge(x.due_date)}${refName(x) ? (refHref(x) ? `<a href="${refHref(x)}">${esc(refName(x))}</a>` : `<span>${esc(refName(x))}</span>`) : ''}</div></div>
    <button class="icon-btn" type="button" data-task-del="${x.id}" aria-label="Delete task">${icon('close')}</button></div>`;

  function vLead(id) {
    const l = byId('leads', id);
    if (!l) return `<a class="back" href="#/leads">${icon('back')} Leads</a><p class="empty">This lead no longer exists.</p>`;
    const client = l.client_id && byId('clients', l.client_id);
    return `<a class="back" href="#/leads">${icon('back')} Leads</a>
    <div class="page-head"><div><h1>${esc(l.name)}</h1><p>${esc(l.project_type || 'Lead')} · added ${rel(l.created_at)} · ${esc(srcLabel(l.source))}</p></div>
      <div class="head-actions">${l.phone ? `<a class="btn btn-ghost" href="tel:${esc(l.phone.replace(/[^\d+]/g, ''))}">${icon('phone')} Call</a>` : ''}${l.email ? `<a class="btn btn-ghost" href="mailto:${esc(l.email)}">${icon('mail')} Email</a>` : ''}</div></div>
    <div class="detail">
      <section class="card">
        <div class="card-head"><h2>Details</h2><button class="linklike" type="button" data-action="edit-lead" data-id="${l.id}">Edit</button></div>
        <div class="field"><label for="stage-sel">Stage</label><select id="stage-sel" data-stage-of="${l.id}">${opts(STAGES.map(s => [s.id, s.label]), l.stage)}</select></div>
        <dl class="kv">
          <dt>Value</dt><dd>${money(l.value)}</dd>
          <dt>Follow up</dt><dd>${l.next_follow_up ? dueBadge(l.next_follow_up) : '<span class="status status-muted">Not set</span>'}</dd>
          <dt>Email</dt><dd>${l.email ? `<a href="mailto:${esc(l.email)}">${esc(l.email)}</a>` : '—'}</dd>
          <dt>Phone</dt><dd>${l.phone ? `<a href="tel:${esc(l.phone.replace(/[^\d+]/g, ''))}">${esc(l.phone)}</a>` : '—'}</dd>
          <dt>Zip</dt><dd>${esc(l.zip || '—')}</dd>
          ${l.stage === 'lost' && l.lost_reason ? `<dt>Lost reason</dt><dd>${esc(l.lost_reason)}</dd>` : ''}
          ${client ? `<dt>Client</dt><dd><a href="#/clients/${client.id}">${esc(client.name)}</a></dd>` : ''}
        </dl>
        ${l.message ? `<div class="message-box">${esc(l.message)}</div>` : ''}
        <div class="actions-row">${client ? '' : `<button class="btn btn-primary" type="button" data-action="convert" data-id="${l.id}">${icon('check')} Convert to client</button>`}
          <button class="btn btn-danger" type="button" data-action="del-lead" data-id="${l.id}">Delete lead</button></div>
      </section>
      <div class="detail-side">
        <section class="card"><div class="card-head"><h2>Tasks</h2></div>${taskList({ lead_id: l.id })}</section>
        <section class="card"><div class="card-head"><h2>History</h2></div>${timeline({ lead_id: l.id })}</section>
      </div>
    </div>`;
  }

  function vTasks() {
    const t = today(), open = openTasks();
    const groups = [
      ['Overdue', open.filter(x => x.due_date && x.due_date < t)],
      ['Today', open.filter(x => x.due_date === t)],
      ['Upcoming', open.filter(x => x.due_date && x.due_date > t)],
      ['No date', open.filter(x => !x.due_date)],
      ['Completed', S.tasks.filter(x => x.done).slice(0, 15)],
    ].map(([n, items]) => [n, items.sort((a, b) => String(a.due_date || '').localeCompare(String(b.due_date || '')))]);
    const follow = S.leads.filter(l => OPEN.includes(l.stage) && l.next_follow_up && l.next_follow_up <= addDays(t, 7)).sort((a, b) => (a.next_follow_up < b.next_follow_up ? -1 : 1));
    return `<div class="page-head"><div><h1>Tasks</h1><p>${open.length} open · ${open.filter(x => x.due_date && x.due_date < t).length} overdue</p></div></div>
      <div class="list"><form class="add-inline" data-addtask="{}"><input class="input" name="title" maxlength="200" placeholder="Add a task…" required aria-label="Task"><input class="input" type="date" name="due_date" value="${t}" aria-label="Due date"><button class="btn btn-primary btn-sm" type="submit">${icon('plus')} Add</button></form></div>
      ${follow.length ? `<h2 class="section-label">Lead follow-ups (next 7 days)</h2><div class="list">${follow.map(l => `<a class="row" href="#/leads/${l.id}"><span class="avatar">${esc(initials(l.name))}</span><span class="grow"><span class="t">${esc(l.name)}</span><span class="s">${esc(stageLabel(l.stage))} · ${esc(l.project_type || '')}</span></span>${dueBadge(l.next_follow_up)}</a>`).join('')}</div>` : ''}
      ${groups.filter(([, items]) => items.length).map(([n, items]) => `<h2 class="section-label">${n} · ${items.length}</h2><div class="list">${items.map(taskItem).join('')}</div>`).join('')}
      ${open.length || S.tasks.length ? '' : '<p class="empty">No tasks yet.</p>'}`;
  }

  let clientQuery = '';
  function vClients() {
    const q = clientQuery.toLowerCase();
    const list = S.clients.filter(c => !q || [c.name, c.email, c.phone, c.address].some(v => String(v || '').toLowerCase().includes(q))).sort((a, b) => a.name.localeCompare(b.name));
    return `<div class="page-head"><div><h1>Clients</h1><p>${S.clients.length} client${S.clients.length === 1 ? '' : 's'}</p></div><div class="head-actions"><button class="btn btn-primary" type="button" data-action="new-client">${icon('plus')} New client</button></div></div>
      <div class="toolbar"><input class="input" type="search" placeholder="Search clients…" value="${esc(clientQuery)}" data-search="clients" aria-label="Search clients"></div>
      <div class="list">${list.map(c => {
        const ps = S.projects.filter(p => p.client_id === c.id), act = ps.filter(p => p.status !== 'completed').length;
        return `<a class="row" href="#/clients/${c.id}"><span class="avatar">${esc(initials(c.name))}</span><span class="grow"><span class="t">${esc(c.name)}</span><span class="s">${esc(c.address || c.email || c.phone || '')}</span></span>
          <span class="r">${ps.length} project${ps.length === 1 ? '' : 's'}<br><small>${act ? `${act} active` : 'none active'}</small></span></a>`;
      }).join('') || '<p class="empty">No clients yet. Convert a won lead, or add one.</p>'}</div>`;
  }

  function vClient(id) {
    const c = byId('clients', id);
    if (!c) return `<a class="back" href="#/clients">${icon('back')} Clients</a><p class="empty">This client no longer exists.</p>`;
    const ps = S.projects.filter(p => p.client_id === c.id), lead = c.lead_id && byId('leads', c.lead_id);
    const spent = ps.reduce((s, p) => s + (Number(p.budget) || 0), 0);
    return `<a class="back" href="#/clients">${icon('back')} Clients</a>
    <div class="page-head"><div><h1>${esc(c.name)}</h1><p>Client since ${fmtDate(c.created_at)} · ${ps.length} project${ps.length === 1 ? '' : 's'} · ${money(spent)} total</p></div>
      <div class="head-actions">${c.phone ? `<a class="btn btn-ghost" href="tel:${esc(c.phone.replace(/[^\d+]/g, ''))}">${icon('phone')} Call</a>` : ''}${c.email ? `<a class="btn btn-ghost" href="mailto:${esc(c.email)}">${icon('mail')} Email</a>` : ''}</div></div>
    <div class="detail">
      <div class="detail-side">
        <section class="card"><div class="card-head"><h2>Contact</h2><button class="linklike" type="button" data-action="edit-client" data-id="${c.id}">Edit</button></div>
          <dl class="kv"><dt>Email</dt><dd>${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : '—'}</dd><dt>Phone</dt><dd>${esc(c.phone || '—')}</dd><dt>Address</dt><dd>${esc(c.address || '—')}</dd>
          ${lead ? `<dt>Original lead</dt><dd><a href="#/leads/${lead.id}">${esc(lead.project_type || 'View lead')}</a></dd>` : ''}</dl>
          ${c.notes ? `<div class="message-box">${esc(c.notes)}</div>` : ''}
          <div class="actions-row"><button class="btn btn-danger btn-sm" type="button" data-action="del-client" data-id="${c.id}">Delete client</button></div></section>
        <section class="card"><div class="card-head"><h2>Projects</h2><button class="btn btn-ghost btn-sm" type="button" data-action="new-project" data-client="${c.id}">${icon('plus')} Project</button></div>
          <div class="projects-stack">${ps.map(projectCard).join('') || '<p class="empty">No projects yet.</p>'}</div></section>
      </div>
      <div class="detail-side">
        <section class="card"><div class="card-head"><h2>Tasks</h2></div>${taskList({ client_id: c.id })}</section>
        <section class="card"><div class="card-head"><h2>History</h2></div>${timeline({ client_id: c.id })}</section>
      </div>
    </div>`;
  }
  const pClass = s => ({ planning: 'status-muted', design: 'status-warn', in_progress: 'status-good', on_hold: 'status-crit', completed: 'status-muted' }[s]);
  const pIcon = s => ({ on_hold: 'alert', completed: 'check', in_progress: 'clock' }[s] || 'clock');
  const projectCard = p => `<button class="project-card" type="button" data-action="edit-project" data-id="${p.id}"><span class="t">${esc(p.name)}</span>
    <span class="s"><span class="status ${pClass(p.status)}">${icon(pIcon(p.status))} ${esc(pLabel(p.status))}</span><span>${money(p.budget)}</span>${p.target_date && p.status !== 'completed' ? `<span>Target ${fmtDate(p.target_date)}</span>` : ''}${p.completed_date ? `<span>Completed ${fmtDate(p.completed_date)}</span>` : ''}</span></button>`;

  let projFilter = 'active';
  function vProjects() {
    const f = p => projFilter === 'all' || (projFilter === 'active' ? p.status !== 'completed' : p.status === projFilter);
    const list = S.projects.filter(f).sort((a, b) => String(a.target_date || '9').localeCompare(String(b.target_date || '9')));
    const active = S.projects.filter(p => p.status !== 'completed');
    return `<div class="page-head"><div><h1>Projects</h1><p>${active.length} active · ${money(active.reduce((s, p) => s + (Number(p.budget) || 0), 0))} in active budgets</p></div>
      <div class="head-actions"><button class="btn btn-primary" type="button" data-action="new-project">${icon('plus')} New project</button></div></div>
      <div class="chips" role="group" aria-label="Filter projects">${[['active', 'Active'], ...PSTATUS.map(s => [s.id, s.label]), ['all', 'All']].map(([v, l]) => `<button class="chip" type="button" data-projfilter="${v}" aria-pressed="${projFilter === v}">${l}<span>${S.projects.filter(p => v === 'all' || (v === 'active' ? p.status !== 'completed' : p.status === v)).length}</span></button>`).join('')}</div>
      <div class="list">${list.map(p => {
        const c = byId('clients', p.client_id);
        return `<button class="row" type="button" data-action="edit-project" data-id="${p.id}"><span class="avatar">${esc(initials(c?.name))}</span><span class="grow"><span class="t">${esc(p.name)}</span><span class="s">${esc(c?.name || '')}${p.target_date && p.status !== 'completed' ? ' · target ' + fmtDate(p.target_date) : ''}</span></span>
          <span class="r"><span class="status ${pClass(p.status)}">${icon(pIcon(p.status))} ${esc(pLabel(p.status))}</span><br><small>${money(p.budget)}</small></span></button>`;
      }).join('') || '<p class="empty">No projects here.</p>'}</div>`;
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
        const n = await insert('leads', row); await log('Lead added manually.', { lead_id: n.id }); toast('Lead added'); location.hash = `#/leads/${n.id}`;
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
      <div class="modal-foot">${p.id ? `<button class="btn btn-danger" type="button" data-del-project="${p.id}">Delete</button><span class="spacer"></span>` : ''}<button class="btn btn-ghost" type="button" data-close>Cancel</button><button class="btn btn-primary" type="submit">${p.id ? 'Save' : 'Add project'}</button></div></form>`,
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
    const a = e.target.closest('[data-action],[data-leadview],[data-stagefilter],[data-projfilter],[data-toggle-table],[data-task-del]');
    if (!a) return;
    const act = a.dataset.action, id = a.dataset.id;
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
      else if (act === 'del-lead') { const l = byId('leads', id); if (await confirmBox('Delete lead?', `${l.name} and their notes and tasks will be deleted. This can’t be undone.`)) { await remove('leads', id); toast('Lead deleted'); location.hash = '#/leads'; } }
      else if (act === 'new-client') clientForm();
      else if (act === 'edit-client') clientForm(byId('clients', id));
      else if (act === 'del-client') { const c = byId('clients', id); if (await confirmBox('Delete client?', `${c.name}, their projects, notes and tasks will be deleted. This can’t be undone.`)) { await remove('clients', id); toast('Client deleted'); location.hash = '#/clients'; } }
      else if (act === 'new-project') projectForm({}, a.dataset.client);
      else if (act === 'edit-project') projectForm(byId('projects', id));
      else if (act === 'new-task') taskForm();
      else if (act === 'export') exportCsv();
      else if (act === 'signout') { await auth.signOut(); location.hash = ''; render(); }
      else if (act === 'reset-demo') { if (await confirmBox('Reset demo data?', 'This restores the original sample data in this browser.', 'Reset')) { demo.reset(); await loadAll(); toast('Demo data reset'); render(); } }
    } catch (err) { handleErr(err); }
  });
  app.addEventListener('change', async e => {
    try {
      const done = e.target.dataset.taskDone, st = e.target.dataset.stageOf;
      if (done) { const on = e.target.checked; await update('tasks', done, { done: on, completed_at: on ? new Date().toISOString() : null }); toast(on ? 'Task completed' : 'Task reopened'); render(); }
      if (st) await changeStage(st, e.target.value);
    } catch (err) { handleErr(err); }
  });
  app.addEventListener('input', e => {
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
  async function changeStage(id, stage) {
    const l = byId('leads', id); if (!l || l.stage === stage) return;
    await log(`Stage changed: ${stageLabel(l.stage)} → ${stageLabel(stage)}`, { lead_id: id }, 'stage');
    await update('leads', id, { stage, ...(stage === 'won' || stage === 'lost' ? { next_follow_up: null } : {}) });
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
  const brand = '<div class="brand"><span class="brand-sub">Interiors by</span><span class="brand-name">JanLee</span><span class="brand-tag">Studio CRM</span></div>';
  function vLogin(msg = '', ok = false) {
    app.innerHTML = `<div class="auth"><form class="auth-card form-stack" id="login" novalidate>${brand}
      <label class="field">Email<input name="email" type="email" autocomplete="username" required value="${esc(CFG.adminEmail || '')}"></label>
      <label class="field">Password<input name="password" type="password" autocomplete="current-password" required minlength="8"></label>
      <p class="auth-msg ${ok ? 'ok' : 'err'}" role="alert">${esc(msg)}</p>
      <button class="btn btn-primary btn-block" type="submit">Sign in</button>
      <p class="auth-alt"><button class="linklike" type="button" id="forgot">Forgot password?</button></p></form></div>`;
    const f = $('#login'), m = $('.auth-msg', f);
    let fails = 0;
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(f)), btn = $('button[type=submit]', f);
      if (!d.email || !d.password) { m.className = 'auth-msg err'; m.textContent = 'Enter your email and password.'; return; }
      btn.disabled = true; m.textContent = '';
      try { await auth.signIn(d.email.trim(), d.password); await boot(); }
      catch (err) {
        fails++; m.className = 'auth-msg err';
        m.textContent = /invalid/i.test(err.message) ? 'Email or password is incorrect.' : err.message;
        // slow down repeated guesses in this tab (Supabase also rate-limits server-side)
        if (fails >= 3) { btn.textContent = 'Please wait…'; setTimeout(() => { btn.disabled = false; btn.textContent = 'Sign in'; }, 2000 * fails); return; }
      }
      btn.disabled = false;
    });
    $('#forgot').onclick = async () => {
      const email = f.email.value.trim();
      if (!email) { m.className = 'auth-msg err'; m.textContent = 'Enter your email first.'; return; }
      try { await auth.recover(email); } catch {}
      m.className = 'auth-msg ok'; m.textContent = 'If that email has an account, a reset link is on its way.';
    };
  }
  function vSetPassword(token) {
    app.innerHTML = `<div class="auth"><form class="auth-card form-stack" id="pw" novalidate>${brand}
      <p>Choose a new password (at least 10 characters).</p>
      <label class="field">New password<input name="p1" type="password" autocomplete="new-password" required minlength="10"></label>
      <label class="field">Confirm password<input name="p2" type="password" autocomplete="new-password" required minlength="10"></label>
      <p class="auth-msg err" role="alert"></p><button class="btn btn-primary btn-block" type="submit">Save password</button></form></div>`;
    const f = $('#pw'), m = $('.auth-msg', f);
    f.addEventListener('submit', async e => {
      e.preventDefault();
      if (f.p1.value.length < 10) { m.textContent = 'Use at least 10 characters.'; return; }
      if (f.p1.value !== f.p2.value) { m.textContent = 'Passwords don’t match.'; return; }
      try { await auth.call('user', { password: f.p1.value }, token); history.replaceState(null, '', '/admin/'); vLogin('Password updated — please sign in.', true); }
      catch (err) { m.textContent = err.message; }
    });
  }

  // ---------- router ----------
  function route() {
    const [path, qs] = (location.hash.slice(2) || 'dashboard').split('?');
    const [name, id] = path.split('/');
    return { name, id, params: new URLSearchParams(qs || '') };
  }
  function render() {
    if (!DEMO && !auth.s) return vLogin();
    if (!S.loaded) { app.innerHTML = '<div class="loading">Loading…</div>'; return; }
    const r = route();
    const views = { dashboard: vDashboard, leads: () => (r.id ? vLead(r.id) : vLeads(r.params)), tasks: vTasks, clients: () => (r.id ? vClient(r.id) : vClients()), projects: vProjects };
    const view = views[r.name] || vDashboard;
    const active = views[r.name] ? r.name : 'dashboard';
    app.innerHTML = shell(active, view());
    document.title = `${{ dashboard: 'Dashboard', leads: r.id ? byId('leads', r.id)?.name || 'Lead' : 'Leads', tasks: 'Tasks', clients: r.id ? byId('clients', r.id)?.name || 'Client' : 'Clients', projects: 'Projects' }[active]} · JanLee CRM`;
  }
  let lastRoute = '';
  addEventListener('hashchange', () => { const k = route().name + '/' + (route().id || ''); render(); if (k !== lastRoute) { scrollTo(0, 0); lastRoute = k; } });

  async function boot() {
    // password-recovery redirect from Supabase: #access_token=…&type=recovery
    const h = new URLSearchParams(location.hash.slice(1));
    if (!DEMO && h.get('type') === 'recovery' && h.get('access_token')) return vSetPassword(h.get('access_token'));
    if (!DEMO && !auth.s) return vLogin();
    app.innerHTML = '<div class="loading">Loading…</div>';
    try { await loadAll(); render(); }
    catch (err) { if (err.message === 'signed_out') vLogin('Please sign in again.'); else { app.innerHTML = `<div class="auth"><div class="auth-card">${brand}<p class="auth-msg err">Couldn’t load your data: ${esc(err.message)}</p><button class="btn btn-ghost btn-block" type="button" id="retry">Try again</button></div></div>`; $('#retry').onclick = boot; } }
  }
  // refresh data when returning to the tab (e.g. a new website enquiry arrived)
  document.addEventListener('visibilitychange', async () => { if (!document.hidden && S.loaded && (DEMO || auth.s) && !modal.open) { try { await loadAll(); render(); } catch {} } });
  boot();
})();
