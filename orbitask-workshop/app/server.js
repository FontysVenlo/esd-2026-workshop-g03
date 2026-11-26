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
const TICKETS = JSON.parse(fs.readFileSync(path.join(APP_DIR, 'data', 'tickets.json'), 'utf8'));
const N = TICKETS.tickets.length;

// Presenter mode (orbitask-presenter image): all tickets visible, reference solutions next to each ticket and a
// draw.io file that has a TO-BE solution page after every as-is process. The student image has no solution files.
const PRESENTER = process.env.PRESENTER === '1';
const PRESENTER_DIR = process.env.PRESENTER_DIR || path.join(APP_DIR, 'presenter');
// The presenter app is password-protected (HTTP Basic auth, any user name). The password is never stored in the
// repo: it comes from the PRESENTER_PASSWORD environment variable (see orbitask-presenter/.env).
const PRESENTER_PASSWORD = process.env.PRESENTER_PASSWORD || '';
if (PRESENTER && !PRESENTER_PASSWORD) {
  console.error('PRESENTER_PASSWORD is not set – refusing to serve the solutions without a password.');
  process.exit(1);
}
function authorized(req) {
  const m = /^Basic\s+(.+)$/i.exec(req.headers.authorization || '');
  if (!m) return false;
  const decoded = Buffer.from(m[1], 'base64').toString('utf8');
  const given = crypto.createHash('sha256').update(decoded.slice(decoded.indexOf(':') + 1)).digest();
  const wanted = crypto.createHash('sha256').update(PRESENTER_PASSWORD).digest();
  return crypto.timingSafeEqual(given, wanted);
}
const SOLUTIONS = PRESENTER
  ? JSON.parse(fs.readFileSync(path.join(PRESENTER_DIR, 'solutions.json'), 'utf8')).solutions : null;
const SEED_DIAGRAM = PRESENTER
  ? path.join(PRESENTER_DIR, 'orbitask_reference_solutions.drawio')
  : path.join(APP_DIR, 'data', 'orbitask_as_is_processes.drawio');
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
  return crypto.randomInt(1, N + 1);
}

// "Finished early?" -> the next problem to the right: assigned + 1, wrapping 7 -> 1, skipping ones already active.
const nextNumber = n => (n % N) + 1;
function nextExtra() {
  const active = activeNumbers();
  if (active.length >= N) return null;
  let n = nextNumber(active[active.length - 1]);
  while (active.includes(n)) n = nextNumber(n);
  return n;
}

function loadState() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  let state = null;
  if (fs.existsSync(STATE_FILE)) {
    try { state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch (e) { state = null; }
  }
  if (!state || !state.ticket) {
    state = { ticket: pickTicket(), extra: [], team: '', createdAt: new Date().toISOString(), replies: [],
              seen: {}, savedAt: null };
    writeAtomic(STATE_FILE, JSON.stringify(state, null, 1));
  }
  // Older state files (single ticket): migrate.
  if (!Array.isArray(state.extra)) state.extra = [];
  if (!state.seen) state.seen = state.chatSeen ? { [state.ticket]: true } : {};
  delete state.chatSeen;
  state.replies.forEach(r => { if (!r.ticket) r.ticket = state.ticket; });
  // An explicit PROBLEM always wins (lets the teacher reassign a group).
  const forced = parseInt(process.env.PROBLEM || '', 10);
  if (forced >= 1 && forced <= TICKETS.tickets.length && state.ticket !== forced) {
    state.ticket = forced;
    state.extra = state.extra.filter(n => n !== forced);
    writeAtomic(STATE_FILE, JSON.stringify(state, null, 1));
  }
  if (!fs.existsSync(WORK_FILE)) fs.copyFileSync(SEED_DIAGRAM, WORK_FILE);
  return state;
}

let state = loadState();
const saveState = () => writeAtomic(STATE_FILE, JSON.stringify(state, null, 1));
const ticketByNo = n => TICKETS.tickets[n - 1];
const ticket = () => ticketByNo(state.ticket);
function activeNumbers() {
  if (PRESENTER) return TICKETS.tickets.map(t => t.number);
  return [state.ticket].concat(state.extra);
}
function ticketForClient(n) {
  const t = Object.assign({}, ticketByNo(n), { extra: !PRESENTER && n !== state.ticket });
  if (SOLUTIONS) t.solution = SOLUTIONS[String(n)] || null;
  return t;
}
const validTicket = n => activeNumbers().includes(n);

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

// Hand-in tickets: everything the group was given (in presenter mode: only tickets with a reply).
function handInNumbers() {
  if (!PRESENTER) return activeNumbers();
  const withReplies = activeNumbers().filter(n => state.replies.some(r => r.ticket === n));
  return withReplies.length ? withReplies : [state.ticket];
}

// Builds the hand-in file: the students' diagram plus one extra page per request with their replies.
function buildHandIn() {
  const xml = fs.readFileSync(WORK_FILE, 'utf8');
  const pages = handInNumbers().map((n, i) => {
    const t = ticketByNo(n);
    const mine = state.replies.filter(r => r.ticket === n);
    const replies = mine.length
      ? mine.map(r => `<li><b>${esc(new Date(r.at).toLocaleString('en-GB'))}</b><br>${esc(r.text)
          .replace(/\n/g, '<br>')}</li>`).join('')
      : '<li><i>No written reply was sent.</i></li>';
    const html = `<h2>Hand-in – ${esc(t.id)}: ${esc(t.title)}</h2>`
      + `<p><b>Team:</b> ${esc(state.team || '(not filled in)')}${state.group ? ' (group ' + state.group + ')' : ''}<br><b>Request:</b> `
      + `${i === 0 ? 'assigned request' : 'extra request ' + i + ' (finished early)'}<br><b>Requester:</b> `
      + `${esc(t.from_name)}, ${esc(t.from_role)}<br><b>Process:</b> ${esc(t.process)}<br><b>Scope:</b> `
      + `${esc(t.scope)}</p><h3>Our written proposal (chat replies)</h3><ul>${replies}</ul>`;
    return `<diagram id="handin-${n}" name="Hand-in – ${esc(t.id)}"><mxGraphModel dx="1000" dy="800" grid="1" `
      + `gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" math="0" `
      + `shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="handin-text-${n}" `
      + `value="${esc(html)}" style="text;html=1;whiteSpace=wrap;align=left;verticalAlign=top;spacing=12;`
      + `fillColor=#FFFDF2;strokeColor=#999999;" vertex="1" parent="1"><mxGeometry x="40" y="40" width="760" `
      + `height="600" as="geometry"/></mxCell></root></mxGraphModel></diagram>`;
  }).join('');
  const cleaned = xml.replace(/<diagram id="handin[^"]*"[\s\S]*?<\/diagram>/g, '');
  return cleaned.replace(/<\/mxfile>\s*$/, pages + '</mxfile>');
}

// ---------------------------------------------------------------- routes
async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const p = decodeURIComponent(url.pathname);
  if (PRESENTER && p !== '/healthz' && !authorized(req)) {
    return send(res, 401, 'Presenter area – password required.',
                { 'WWW-Authenticate': 'Basic realm="Orbitask presenter", charset="UTF-8"', 'Content-Type': 'text/plain' });
  }

  if (p === '/api/session' && req.method === 'GET') {
    const next = PRESENTER ? null : nextExtra();
    return json(res, 200, { presenter: PRESENTER, primary: state.ticket, tickets: activeNumbers().map(ticketForClient),
                            next: next && { number: next, process: ticketByNo(next).process },
                            guide: TICKETS.guide, team: state.team, replies: state.replies, seen: state.seen,
                            savedAt: state.savedAt, createdAt: state.createdAt });
  }
  if (p === '/api/extra' && req.method === 'POST') {
    if (PRESENTER) return json(res, 400, { error: 'not in presenter mode' });
    const n = nextExtra();
    if (!n) return json(res, 400, { error: 'no more requests' });
    state.extra.push(n); saveState();
    console.log(`Extra request for team "${state.team}": #${n} ${ticketByNo(n).id} – ${ticketByNo(n).process}`);
    const next = nextExtra();
    return json(res, 200, { ticket: ticketForClient(n),
                            next: next && { number: next, process: ticketByNo(next).process } });
  }
  if (p === '/api/team' && req.method === 'POST') {
    const body = JSON.parse(await readBody(req) || '{}');
    state.team = String(body.team || '').slice(0, 120);
    // The group number (given by the teacher) picks the request: group 1 → request 1 … group 7 → 7, group 8 → 1 again.
    // Only once, and only before the group has read its first message, so a group can't switch request halfway.
    // An explicit PROBLEM (docker-compose.yml) still wins.
    const group = parseInt(body.group, 10);
    const forced = parseInt(process.env.PROBLEM || '', 10);
    if (group >= 1 && group <= 99 && !state.group && !Object.keys(state.seen).length && !state.extra.length
        && !(forced >= 1 && forced <= N)) {
      state.group = group;
      state.ticket = ((group - 1) % N) + 1;
      console.log(`Group ${group} ("${state.team}") → request #${state.ticket} ${ticket().id} – ${ticket().process}`);
    }
    saveState();
    return json(res, 200, { ok: true, team: state.team, group: state.group || null });
  }
  if (p === '/api/seen' && req.method === 'POST') {
    const body = JSON.parse(await readBody(req) || '{}');
    const n = parseInt(body.ticket, 10);
    if (!validTicket(n)) return json(res, 400, { error: 'unknown ticket' });
    state.seen[n] = true; saveState(); return json(res, 200, { ok: true });
  }
  if (p === '/api/reply' && req.method === 'POST') {
    const body = JSON.parse(await readBody(req) || '{}');
    const text = String(body.text || '').trim().slice(0, 8000);
    const n = parseInt(body.ticket, 10);
    if (!text) return json(res, 400, { error: 'empty' });
    if (!validTicket(n)) return json(res, 400, { error: 'unknown ticket' });
    state.replies.push({ at: new Date().toISOString(), ticket: n, text }); saveState();
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
    const ids = handInNumbers().map(n => ticketByNo(n).id).join('+');
    const name = `orbitask_${ids}_${slug(state.team) || 'team'}.drawio`;
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
  if (PRESENTER) console.log(`PRESENTER mode: all ${N} requests + reference solutions (data in ${DATA_DIR})`);
  else console.log(`Assigned problem: #${state.ticket} ${t.id} – ${t.process} (data in ${DATA_DIR})`);
  state.extra.forEach(n => console.log(`Extra request: #${n} ${ticketByNo(n).id} – ${ticketByNo(n).process}`));
});
