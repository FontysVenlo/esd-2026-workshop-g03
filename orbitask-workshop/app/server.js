// Orbitask BPMN workshop – single-container web app (no npm dependencies).
// Serves: the chat front end (/), the draw.io editor (/drawio/), and a tiny JSON API (/api/...).
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '8080', 10);
const APP_DIR = __dirname;
const DATA_DIR = process.env.DATA_DIR || path.join(APP_DIR, 'runtime-data');
const DRAWIO_DIR = process.env.DRAWIO_DIR || path.join(APP_DIR, 'drawio');
const PUBLIC_DIR = path.join(APP_DIR, 'public');
const SEED_DIAGRAM = path.join(APP_DIR, 'data', 'orbitask_as_is_processes.drawio');
const TICKETS = JSON.parse(fs.readFileSync(path.join(APP_DIR, 'data', 'tickets.json'), 'utf8'));
const PRECONFIG = fs.readFileSync(path.join(APP_DIR, 'drawio-config', 'PreConfig.js'), 'utf8');

const STATE_FILE = path.join(DATA_DIR, 'state.json');
const WORK_FILE = path.join(DATA_DIR, 'work.drawio');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const MAX_BODY = 25 * 1024 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.map': 'application/json', '.wasm': 'application/wasm',
  '.drawio': 'application/xml; charset=utf-8', '.webmanifest': 'application/manifest+json',
};

// ---------------------------------------------------------------- state
function writeAtomic(file, data) {
  const tmp = file + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, file);
}

function pickTicket() {
  const forced = parseInt(process.env.PROBLEM || '', 10);
  if (forced >= 1 && forced <= TICKETS.tickets.length) return forced;
  return crypto.randomInt(1, TICKETS.tickets.length + 1);
}

function loadState() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  let state = null;
  if (fs.existsSync(STATE_FILE)) {
    try { state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch (e) { state = null; }
  }
  if (!state || !state.ticket) {
    state = { ticket: pickTicket(), team: '', createdAt: new Date().toISOString(), replies: [],
              chatSeen: false, savedAt: null };
    writeAtomic(STATE_FILE, JSON.stringify(state, null, 1));
  }
  // An explicit PROBLEM always wins (lets the teacher reassign a group).
  const forced = parseInt(process.env.PROBLEM || '', 10);
  if (forced >= 1 && forced <= TICKETS.tickets.length && state.ticket !== forced) {
    state.ticket = forced;
    writeAtomic(STATE_FILE, JSON.stringify(state, null, 1));
  }
  if (!fs.existsSync(WORK_FILE)) fs.copyFileSync(SEED_DIAGRAM, WORK_FILE);
  return state;
}

let state = loadState();
const saveState = () => writeAtomic(STATE_FILE, JSON.stringify(state, null, 1));
const ticket = () => TICKETS.tickets[state.ticket - 1];

let lastBackup = 0;
function backupWork() {
  const now = Date.now();
  if (now - lastBackup < 5 * 60 * 1000 || !fs.existsSync(WORK_FILE)) return;
  lastBackup = now;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(WORK_FILE, path.join(BACKUP_DIR, `work-${stamp}.drawio`));
  const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.drawio')).sort();
  for (const f of files.slice(0, Math.max(0, files.length - 30))) fs.unlinkSync(path.join(BACKUP_DIR, f));
}

// ---------------------------------------------------------------- helpers
function send(res, code, body, headers = {}) {
  res.writeHead(code, Object.assign({ 'Cache-Control': 'no-store' }, headers));
  res.end(body);
}
const json = (res, code, obj) => send(res, code, JSON.stringify(obj), { 'Content-Type': MIME['.json'] });

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error('too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function serveStatic(res, root, rel, cache) {
  const file = path.normalize(path.join(root, rel));
  if (!file.startsWith(root)) return send(res, 403, 'Forbidden');
  fs.stat(file, (err, st) => {
    if (err) return send(res, 404, 'Not found');
    if (st.isDirectory()) return serveStatic(res, root, path.join(rel, 'index.html'), cache);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
                         'Content-Length': st.size, 'Cache-Control': cache ? 'public, max-age=3600' : 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');
const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

// Builds the hand-in file: the students' diagram plus an extra page with the request and their replies.
function buildHandIn() {
  const t = ticket();
  const xml = fs.readFileSync(WORK_FILE, 'utf8');
  const replies = state.replies.length
    ? state.replies.map(r => `<li><b>${esc(new Date(r.at).toLocaleString('en-GB'))}</b><br>${esc(r.text)
        .replace(/\n/g, '<br>')}</li>`).join('')
    : '<li><i>No written reply was sent.</i></li>';
  const html = `<h2>Hand-in – ${esc(t.id)}: ${esc(t.title)}</h2>`
    + `<p><b>Team:</b> ${esc(state.team || '(not filled in)')}<br><b>Requester:</b> ${esc(t.from_name)}, `
    + `${esc(t.from_role)}<br><b>Process:</b> ${esc(t.process)}<br><b>Scope:</b> ${esc(t.scope)}</p>`
    + `<h3>Our written proposal (chat replies)</h3><ul>${replies}</ul>`;
  const page = `<diagram id="handin" name="Hand-in – ${esc(t.id)}"><mxGraphModel dx="1000" dy="800" grid="1" `
    + `gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" math="0" `
    + `shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="handin-text" value="${esc(html)}" `
    + `style="text;html=1;whiteSpace=wrap;align=left;verticalAlign=top;spacing=12;fillColor=#FFFDF2;`
    + `strokeColor=#999999;" vertex="1" parent="1"><mxGeometry x="40" y="40" width="760" height="600" `
    + `as="geometry"/></mxCell></root></mxGraphModel></diagram>`;
  const cleaned = xml.replace(/<diagram id="handin"[\s\S]*?<\/diagram>/g, '');
  return cleaned.replace(/<\/mxfile>\s*$/, page + '</mxfile>');
}

// ---------------------------------------------------------------- routes
async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const p = decodeURIComponent(url.pathname);

  if (p === '/api/session' && req.method === 'GET') {
    const t = ticket();
    return json(res, 200, { ticket: t, guide: TICKETS.guide, team: state.team, replies: state.replies,
                            chatSeen: state.chatSeen, savedAt: state.savedAt, createdAt: state.createdAt });
  }
  if (p === '/api/team' && req.method === 'POST') {
    const body = JSON.parse(await readBody(req) || '{}');
    state.team = String(body.team || '').slice(0, 120); saveState();
    return json(res, 200, { ok: true, team: state.team });
  }
  if (p === '/api/seen' && req.method === 'POST') {
    state.chatSeen = true; saveState(); return json(res, 200, { ok: true });
  }
  if (p === '/api/reply' && req.method === 'POST') {
    const body = JSON.parse(await readBody(req) || '{}');
    const text = String(body.text || '').trim().slice(0, 8000);
    if (!text) return json(res, 400, { error: 'empty' });
    state.replies.push({ at: new Date().toISOString(), text }); saveState();
    return json(res, 200, { ok: true, replies: state.replies });
  }
  if (p === '/api/diagram' && req.method === 'GET') {
    return send(res, 200, fs.readFileSync(WORK_FILE), { 'Content-Type': MIME['.drawio'] });
  }
  if (p === '/api/diagram' && req.method === 'PUT') {
    const xml = await readBody(req);
    if (!/^\s*<mxfile[\s>]/.test(xml) || !/<\/mxfile>\s*$/.test(xml)) return json(res, 400, { error: 'not a draw.io file' });
    backupWork();
    writeAtomic(WORK_FILE, xml);
    state.savedAt = new Date().toISOString(); saveState();
    return json(res, 200, { ok: true, savedAt: state.savedAt });
  }
  if (p === '/api/restore' && req.method === 'POST') {
    lastBackup = 0; backupWork();
    fs.copyFileSync(SEED_DIAGRAM, WORK_FILE);
    state.savedAt = new Date().toISOString(); saveState();
    return json(res, 200, { ok: true });
  }
  if (p === '/api/handin' && req.method === 'GET') {
    const t = ticket();
    const name = `orbitask_${t.id}_${slug(state.team) || 'team'}.drawio`;
    return send(res, 200, buildHandIn(), { 'Content-Type': MIME['.drawio'],
                                          'Content-Disposition': `attachment; filename="${name}"` });
  }
  if (p === '/drawio/js/PreConfig.js') {
    return send(res, 200, PRECONFIG, { 'Content-Type': MIME['.js'] });
  }
  if (p.startsWith('/drawio/')) return serveStatic(res, DRAWIO_DIR, p.slice('/drawio/'.length), true);
  if (p === '/drawio') return send(res, 302, '', { Location: '/drawio/' });
  if (p === '/' || p === '/index.html') return serveStatic(res, PUBLIC_DIR, 'index.html', false);
  if (p.startsWith('/static/')) return serveStatic(res, PUBLIC_DIR, p.slice('/static/'.length), false);
  if (p === '/healthz') return send(res, 200, 'ok');
  return send(res, 404, 'Not found');
}

http.createServer((req, res) => {
  handle(req, res).catch(err => { console.error(err); if (!res.headersSent) json(res, 500, { error: 'server error' }); });
}).listen(PORT, () => {
  const t = ticket();
  console.log(`Orbitask workshop running on http://localhost:${PORT}`);
  console.log(`Assigned problem: #${state.ticket} ${t.id} – ${t.process} (data in ${DATA_DIR})`);
});
