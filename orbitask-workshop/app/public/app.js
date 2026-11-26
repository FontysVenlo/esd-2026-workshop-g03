/* Orbitask Connect – front end for the BPMN workshop container. No external libraries. */
(function () {
  'use strict';

  const $ = sel => document.querySelector(sel);
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const hhmm = d => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const PRIO_COLOR = { Critical: '#B91C1C', High: '#C2410C', Medium: '#1D4ED8' };

  let S = null;              // session from the server
  let TICKETS = [];          // tickets this container has (assigned + extra; all of them in presenter mode)
  let T = null;              // ticket currently shown (chat / brief / editor)
  const unread = new Set();  // ticket numbers with an unread message
  let currentView = null;
  let currentChat = null;    // ticket number
  let animating = false;

  const PRESENTER = () => S && S.presenter;
  const byNo = n => TICKETS.find(t => t.number === n);
  const isSeen = n => !!(S.seen && S.seen[n]);
  const delivered = t => isSeen(t.number) || unread.has(t.number);

  // ------------------------------------------------------------ api
  async function api(path, opts) {
    const r = await fetch(path, opts);
    if (!r.ok) throw new Error(path + ' → ' + r.status);
    const ct = r.headers.get('content-type') || '';
    return ct.includes('json') ? r.json() : r.text();
  }
  const post = (path, body) => api(path, { method: 'POST', headers: { 'Content-Type': 'application/json' },
                                           body: JSON.stringify(body || {}) });

  // ------------------------------------------------------------ views
  function showView(name) {
    if (name !== 'welcome' && S && !PRESENTER() && !S.team && !isSeen(S.primary) && !S._started) name = 'welcome';
    document.querySelectorAll('.view').forEach(v => { v.hidden = v.id !== 'view-' + name; });
    document.querySelectorAll('.rail-btn').forEach(b => b.classList.toggle('active', b.dataset.view === name));
    currentView = name;
    if (name === 'chat') openChat(currentChat);
    if (name === 'editor') ensureEditor();
    if (name === 'activity') renderActivity();
    if (name === 'solutions') renderSolutions();
    syncRoute();
  }

  // ------------------------------------------------------------ links (#/chat/ORB-1090, #/editor/ORB-1090/to-be, …)
  // Every view has its own URL, so a page refresh (or a bookmark / the back button) lands on the same place.
  let applyingRoute = false;
  const byId = id => TICKETS.find(t => t.id.toLowerCase() === String(id || '').toLowerCase());
  const byPage = pageId => TICKETS.find(t => t.page_id === String(pageId).replace(/-tobe$/, ''));
  const isToBe = pageId => /-tobe$/.test(pageId || '');

  function routeFor() {
    if (!currentView || currentView === 'welcome' || !T) return '';
    if (currentView === 'chat') return '#/chat/' + T.id;
    if (currentView === 'editor') return '#/editor/' + T.id + (PRESENTER() && isToBe(editorPage) ? '/to-be' : '');
    return '#/' + currentView;
  }

  function syncRoute(replace) {
    if (applyingRoute) return;
    const r = routeFor();
    if (!r || location.hash === r) return;
    if (replace || !location.hash) history.replaceState(null, '', r); else history.pushState(null, '', r);
  }

  // Opens the view named in the URL. Returns false if the URL names nothing (-> caller shows the default view).
  function applyRoute() {
    const [view, id, sub] = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
    const t = byId(id);
    applyingRoute = true;
    try {
      if (view === 'chat') openChat(t ? t.number : null);
      else if (view === 'editor') { if (t) openInEditor(t, PRESENTER() && sub === 'to-be'); else showView('editor'); }
      else if (view === 'activity' || (view === 'solutions' && PRESENTER())) showView(view);
      else return false;
    } finally { applyingRoute = false; }
    syncRoute(true); // normalise, e.g. #/chat -> #/chat/ORB-1090
    return true;
  }

  window.addEventListener('hashchange', () => { if (S && S._started) applyRoute(); });

  function avatar(name, color, initials) {
    const a = el('span', 'avatar', initials);
    a.style.background = color;
    a.title = name;
    return a;
  }

  function updateBadges() {
    const n = unread.size;
    ['#badgeChat', '#badgeActivity'].forEach(id => { $(id).hidden = !n; $(id).textContent = n; });
    document.title = (n ? `(${n}) ` : '') + (PRESENTER() ? 'Orbitask Connect – Presenter' : 'Orbitask Connect');
    renderChatList();
  }
  function setUnread(num, on) {
    if (on) unread.add(num); else unread.delete(num);
    updateBadges();
  }

  // Switch the "current" ticket (chat header, request panel, editor page).
  function selectTicket(num, fromEditor) {
    const t = byNo(num);
    if (!t || t === T) return;
    T = t;
    $('#ticketChip').textContent = `${T.id} · ${T.process}`;
    renderBrief();
    if (editorReady && !fromEditor) goToPage(T.page_id);
    if (currentView === 'editor') syncRoute(fromEditor);
  }

  // ------------------------------------------------------------ welcome + notification
  $('#startBtn').addEventListener('click', start);
  ['#teamInput', '#groupInput'].forEach(id => $(id).addEventListener('keydown', e => { if (e.key === 'Enter') start(); }));

  async function start() {
    const group = parseInt($('#groupInput').value, 10);
    const team = $('#teamInput').value.trim();
    if (!(group >= 1 && group <= 99)) {
      $('#groupInput').value = ''; $('#groupInput').focus();
      $('#groupInput').placeholder = 'Please enter your group number (1, 2, 3…)'; return;
    }
    if (!team) { $('#teamInput').focus(); $('#teamInput').placeholder = 'Please enter your names or group name'; return; }
    await post('/api/team', { team, group });
    // The group number decides the request: reload the session so the chat, editor and "next request" follow it.
    const fresh = await api('/api/session');
    S = Object.assign(fresh, { seen: fresh.seen || {} });
    TICKETS = S.tickets; T = null; selectTicket(S.primary);
    S._started = true;
    showTeam();
    showView('activity');
    await sleep(2500);
    deliverNotification(byNo(S.primary));
  }

  function showTeam() {
    const l = $('#teamLabel');
    const text = PRESENTER() ? 'Presenter' : S.team;
    l.textContent = text; l.hidden = !text; l.title = text;
    l.classList.toggle('presenter', !!PRESENTER());
  }

  function deliverNotification(t, quiet) {
    setUnread(t.number, true);
    renderActivity();
    if (quiet) return;
    const box = $('#toast');
    box.innerHTML = '';
    box.appendChild(avatar(t.from_name, t.color, t.initials));
    const inner = el('div');
    inner.appendChild(el('div', 't-app', 'Orbitask Connect · now'));
    inner.appendChild(el('b', null, t.from_name));
    inner.appendChild(el('div', 't-body', t.script[0].text));
    box.appendChild(inner);
    box.hidden = false;
    box.onclick = () => { box.hidden = true; openChat(t.number); };
    try { // short, quiet notification sound
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880; g.gain.value = 0.04; o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + 0.12);
    } catch (e) { /* ignore */ }
  }

  function renderActivity() {
    const list = $('#activityList');
    list.innerHTML = '';
    const shown = TICKETS.filter(delivered);
    if (!shown.length) {
      const w = el('div', 'waiting');
      w.appendChild(el('div', null, 'No activity yet.'));
      w.appendChild(el('small', null, 'Waiting for messages from your colleagues…'));
      list.appendChild(w);
      return;
    }
    shown.slice().reverse().forEach(t => {
      const item = el('button', 'activity-item' + (unread.has(t.number) ? ' unread' : ''));
      item.appendChild(avatar(t.from_name, t.color, t.initials));
      const txt = el('div');
      txt.appendChild(el('b', null, `${t.from_name} sent you a message${t.extra ? ' (extra request)' : ''}`));
      txt.appendChild(el('small', null, `${t.from_role} · ${t.title}`));
      item.appendChild(txt);
      item.onclick = () => openChat(t.number);
      list.appendChild(item);
    });
    if (!PRESENTER()) list.appendChild(extraCard());
  }

  // ------------------------------------------------------------ extra request ("finished early?")
  function extraCard() {
    const c = el('div', 'extra-card');
    if (!S.next) {
      c.appendChild(el('b', null, 'You have every request already. Impressive!'));
      return c;
    }
    c.appendChild(el('b', null, 'Finished early?'));
    c.appendChild(el('small', null, `Next up: ${S.next.process}`));
    const btn = el('button', 'ghost', 'Get an extra request');
    btn.onclick = requestExtra;
    c.appendChild(btn);
    return c;
  }

  async function requestExtra() {
    if (!S.next) return;
    const ok = await confirmDlg('Take on an extra request?',
      `Next request: "${S.next.process}". Model its to-be on a new page in the same file.`,
      'Yes, give us more');
    if (!ok) return;
    const r = await post('/api/extra');
    TICKETS.push(r.ticket);
    S.next = r.next;
    renderChatList();
    renderActivity();
    if (currentView !== 'activity') showView('activity');
    await sleep(1500);
    deliverNotification(r.ticket);
  }

  // ------------------------------------------------------------ chat
  function renderChatList() {
    const wrap = $('#chatItems');
    wrap.innerHTML = '';
    TICKETS.forEach(t => {
      const it = el('button', 'chat-item');
      it.dataset.chat = t.number;
      it.appendChild(avatar(t.from_name, t.color, t.initials));
      const tx = el('span', 'ci-text');
      tx.appendChild(el('b', unread.has(t.number) ? 'unread' : null, t.from_name));
      const sub = delivered(t) ? t.script[0].text : t.from_role;
      tx.appendChild(el('small', null, (PRESENTER() || t.extra ? t.id + ' · ' : '') + sub));
      it.appendChild(tx);
      if (!delivered(t) && !PRESENTER()) it.disabled = true;
      it.onclick = () => openChat(t.number);
      wrap.appendChild(it);
    });
    document.querySelectorAll('.chat-item').forEach(c => c.classList.toggle('active', String(c.dataset.chat) === String(currentChat)));
    const ex = $('#chatExtra');
    ex.innerHTML = '';
    if (!PRESENTER() && isSeen(S.primary)) ex.appendChild(extraCard());
  }

  function convHead() {
    const h = $('#convHead');
    h.innerHTML = '';
    h.appendChild(avatar(T.from_name, T.color, T.initials));
    const w = el('div', 'who');
    w.appendChild(el('b', null, T.from_name));
    w.appendChild(el('small', null, `${T.from_role} · ticket ${T.id}${T.extra ? ' · extra request' : ''}`));
    h.appendChild(w);
    const p = el('span', 'prio', T.priority.toUpperCase());
    p.style.background = PRIO_COLOR[T.priority] || '#555';
    h.appendChild(p);
  }

  function groupFor(who, time, mine) {
    const g = el('div', 'msg-group' + (mine ? ' mine' : ''));
    if (!mine) g.appendChild(avatar(T.from_name, T.color, T.initials));
    const col = el('div', 'bubbles');
    const meta = el('div', 'msg-meta');
    meta.appendChild(el('b', null, mine ? (PRESENTER() ? 'Presenter' : (S.team || 'You')) : T.from_name));
    meta.appendChild(document.createTextNode(hhmm(time)));
    col.appendChild(meta);
    g.appendChild(col);
    $('#messages').appendChild(g);
    return col;
  }

  function bubbleFor(item) {
    const b = el('div', 'bubble');
    if (item.type === 'text') b.textContent = item.text;
    if (item.type === 'list') {
      b.appendChild(document.createTextNode(item.intro));
      const ul = el('ul');
      item.items.forEach(i => ul.appendChild(el('li', null, i)));
      b.appendChild(ul);
    }
    if (item.type === 'process') {
      b.appendChild(document.createTextNode(item.text));
      const card = el('div', 'process-card');
      const top = el('div', 'pc-top');
      const ic = el('span', 'pc-icon');
      ic.innerHTML = '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="7" height="5" rx="1"/><rect x="14" y="15" width="7" height="5" rx="1"/><path d="M6.5 9v4.5h11V15"/></svg>';
      top.appendChild(ic);
      const t = el('div');
      t.appendChild(el('b', null, T.process));
      t.appendChild(el('small', null, 'orbitask_as_is_processes.drawio'));
      top.appendChild(t);
      card.appendChild(top);
      const link = el('a', 'pc-open', 'Open in the process editor');
      link.href = '#/editor/' + encodeURIComponent(T.id);
      card.appendChild(link);
      b.appendChild(card);
    }
    return b;
  }

  function scrollDown() { const m = $('#messages'); m.scrollTop = m.scrollHeight; }

  function ackText(index) {
    return index === 0 ? T.ack : 'Noted, thanks for the update!';
  }

  const repliesFor = n => S.replies.filter(r => r.ticket === n);

  function renderReplies() {
    repliesFor(T.number).forEach((r, i) => {
      groupFor('me', r.at, true).appendChild(el('div', 'bubble', r.text));
      groupFor('manager', r.at, false).appendChild(el('div', 'bubble', ackText(i)));
    });
  }

  async function openChat(kind) {
    if (kind == null) kind = (TICKETS.find(t => unread.has(t.number)) || T).number;
    currentChat = kind;
    selectTicket(kind);
    renderChatList();
    if (currentView !== 'chat') { showView('chat'); return; }
    syncRoute();
    convHead();
    const msgs = $('#messages');
    msgs.innerHTML = '';
    const composer = $('#composer');
    const num = T.number;
    if (!delivered(T)) { // nothing received yet
      if (PRESENTER()) { deliverNotification(T, true); } else {
        composer.classList.add('disabled');
        msgs.appendChild(el('div', 'waiting', 'No messages yet.'));
        return;
      }
    }
    composer.classList.remove('disabled');
    if (!isSeen(num)) {
      if (animating) return;
      animating = true;
      composer.classList.add('disabled');
      setUnread(num, false);
      $('#toast').hidden = true;
      const col = groupFor('manager', new Date(), false);
      for (const item of T.script) {
        if (currentChat !== num) break; // user switched chat during the animation
        const typing = el('div', 'bubble typing');
        typing.innerHTML = '<i></i><i></i><i></i>';
        col.appendChild(typing); scrollDown();
        const len = (item.text || item.intro || '').length + (item.items ? item.items.join(' ').length : 0);
        await sleep(Math.min(2600, 700 + len * 9));
        typing.replaceWith(bubbleFor(item)); scrollDown();
        await sleep(350);
      }
      S.seen[num] = true;
      animating = false;
      post('/api/seen', { ticket: num });
      renderChatList();
      renderActivity();
      if (currentChat === num) { composer.classList.remove('disabled'); $('#replyInput').focus(); }
      else if (currentView === 'chat') openChat(currentChat);
      return;
    }
    setUnread(num, false);
    const col = groupFor('manager', S.createdAt, false);
    T.script.forEach(item => col.appendChild(bubbleFor(item)));
    renderReplies();
    scrollDown();
  }

  $('#composer').addEventListener('submit', async e => { e.preventDefault(); await sendReply(); });
  $('#replyInput').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); }
  });

  async function sendReply() {
    const input = $('#replyInput');
    const text = input.value.trim();
    if (!text || !isSeen(T.number)) return;
    const num = T.number;
    input.value = '';
    const r = await post('/api/reply', { text, ticket: num });
    S.replies = r.replies;
    const idx = repliesFor(num).length - 1;
    groupFor('me', new Date(), true).appendChild(el('div', 'bubble', text));
    scrollDown();
    await sleep(900);
    if (currentChat !== num) return;
    const col = groupFor('manager', new Date(), false);
    const typing = el('div', 'bubble typing'); typing.innerHTML = '<i></i><i></i><i></i>';
    col.appendChild(typing); scrollDown();
    await sleep(1600);
    typing.replaceWith(el('div', 'bubble', ackText(idx)));
    scrollDown();
    renderChatList();
  }

  // ------------------------------------------------------------ presenter: reference solutions
  function solutionBlock(t, open) {
    const s = t.solution;
    const d = el('details', 'solution');
    d.open = !!open;
    d.appendChild(el('summary', null, 'Reference solution'));
    if (!s) { d.appendChild(el('p', null, 'No solution available.')); return d; }
    d.appendChild(el('p', 'sol-summary', s.summary));
    [['What changes (as-is → to-be)', s.changes], ['IT tools', s.tools], ['Expected gain', s.gain],
     ['Discussion points', s.discussion]].forEach(([h, items]) => {
      if (!items || !items.length) return;
      d.appendChild(el('h4', null, h));
      const ul = el('ul'); items.forEach(x => ul.appendChild(el('li', null, x))); d.appendChild(ul);
    });
    const bar = el('div', 'sol-actions');
    const asis = el('button', 'ghost', 'Show as-is');
    asis.onclick = () => openInEditor(t, false);
    const tobe = el('button', 'primary', 'Show to-be solution');
    tobe.onclick = () => openInEditor(t, true);
    bar.appendChild(asis); bar.appendChild(tobe);
    d.appendChild(bar);
    return d;
  }

  function openInEditor(t, tobe) {
    selectTicket(t.number, true);
    pendingPage = editorPage = tobe ? t.page_id + '-tobe' : t.page_id;
    showView('editor');
    if (editorReady) { goToPage(pendingPage); pendingPage = null; }
  }

  function renderSolutions() {
    const g = $('#solutions');
    g.innerHTML = '';
    g.appendChild(el('h1', null, 'Reference solutions'));
    g.appendChild(el('p', null, 'One good answer per request – not the only one. The draw.io file in this presenter '
      + 'container has a green TO-BE page right after every as-is process.'));
    TICKETS.forEach(t => {
      const c = el('div', 'card sol-card');
      const head = el('div', 'from');
      head.appendChild(avatar(t.from_name, t.color, t.initials));
      const hw = el('div');
      hw.appendChild(el('b', null, `#${t.number} · ${t.id} – ${t.title}`));
      hw.appendChild(el('small', null, `${t.process} · ${t.from_name}, ${t.from_role}`));
      head.appendChild(hw);
      c.appendChild(head);
      c.appendChild(solutionBlock(t, false));
      g.appendChild(c);
    });
  }

  // ------------------------------------------------------------ editor (draw.io embed)
  let frame = null, editorReady = false, pendingXml = null, saving = false, saveTimer = null, pendingPage = null;
  let editorPage = null; // draw.io page shown in the editor (part of the URL in presenter mode: …/to-be)

  function renderBrief() {
    const b = $('#brief');
    b.innerHTML = '';
    if (TICKETS.length > 1) {
      const sel = el('select', 'brief-switch');
      sel.title = 'Switch request';
      TICKETS.filter(t => PRESENTER() || delivered(t)).forEach(t => {
        const o = el('option', null, `${t.id} · ${t.process}${t.extra ? ' (extra)' : ''}`);
        o.value = t.number; o.selected = t === T; sel.appendChild(o);
      });
      sel.onchange = () => selectTicket(parseInt(sel.value, 10));
      if (sel.options.length > 1) b.appendChild(sel);
    }
    b.appendChild(el('small', 'muted', `${T.id} · ${T.priority} priority${T.extra ? ' · extra request' : ''}`));
    b.appendChild(el('h2', null, T.title));
    const from = el('div', 'from');
    from.appendChild(avatar(T.from_name, T.color, T.initials));
    const fw = el('div'); fw.appendChild(el('b', null, T.from_name)); fw.appendChild(el('small', null, T.from_role));
    from.appendChild(fw); b.appendChild(from);
    if (PRESENTER()) b.appendChild(solutionBlock(T, true));
    b.appendChild(el('h3', null, 'Process & scope'));
    b.appendChild(el('div', null, `${T.process}. ${T.scope}.`));
    const lists = T.script.filter(i => i.type === 'list')
      .concat([{ intro: 'Rules from Orbitask management', items: S.guide.constraints }]);
    lists.forEach(i => {
      b.appendChild(el('h3', null, i.intro.replace(/:$/, '')));
      const ul = el('ul'); i.items.forEach(x => ul.appendChild(el('li', null, x))); b.appendChild(ul);
    });
    const link = el('button', 'ghost', 'Open the chat');
    link.style.marginTop = '14px';
    link.onclick = () => openChat(T.number);
    b.appendChild(link);
  }

  function setStatus(text, cls) {
    const s = $('#saveStatus');
    s.textContent = text; s.className = 'save-status' + (cls ? ' ' + cls : '');
  }

  function ensureEditor() {
    if (frame) return;
    if (window.innerWidth < 1600 && !PRESENTER()) $('.editor-body').classList.add('no-brief');
    const params = new URLSearchParams({
      embed: '1', proto: 'json', spin: '1', noExitBtn: '1', noSaveBtn: '1', saveAndExit: '0',
      libraries: '1', libs: 'general;bpmn2', ui: 'kennedy', stealth: '1', pwa: '0', lang: 'en',
      'page-id': pendingPage || T.page_id,
    });
    editorPage = pendingPage || T.page_id;
    pendingPage = null;
    frame = document.createElement('iframe');
    frame.title = 'draw.io process editor';
    frame.src = '/drawio/index.html?' + params.toString();
    $('#frameWrap').appendChild(frame);
  }

  // draw.io starts embedded mode with collapsed panels. The editor runs on the same origin, so we grab the
  // EditorUi instance once and open the shape library (left) and the format panel (right) for the students.
  let panelsOpened = false;
  function captureEditorUi() {
    try {
      const w = frame.contentWindow;
      const proto = w.EditorUi && w.EditorUi.prototype;
      if (!proto || proto.__orbitaskHooked) return;
      const orig = proto.createLoadMessage;
      proto.createLoadMessage = function () { w.__orbitaskUi = this; return orig.apply(this, arguments); };
      proto.__orbitaskHooked = true;
    } catch (e) { /* not critical */ }
  }

  function openPanels() {
    if (panelsOpened) return;
    try {
      const ui = frame.contentWindow.__orbitaskUi;
      if (!ui) return;
      if (ui.isShapesPanelVisible && !ui.isShapesPanelVisible()) ui.toggleShapesPanel(true);
      if (ui.isFormatPanelVisible && !ui.isFormatPanelVisible()) ui.toggleFormatPanel(true);
      panelsOpened = true;
      setTimeout(() => fitPage(ui), 300);
    } catch (e) { /* not critical */ }
  }

  // Zoom so the whole process is visible. If the canvas is too narrow for that (small screen, panels open), a fit
  // would zoom out so far that the page looks empty – then show it at a readable zoom from the top-left instead.
  function fitPage(ui) {
    try {
      ui.actions.get('fitWindow').funct();
      if (ui.editor.graph.view.scale < 0.2) ui.actions.get('resetView').funct();
    } catch (e) { /* ignore */ }
  }

  // Follow page changes made inside draw.io (page tabs at the bottom): the request panel and the URL go along.
  function watchPages() {
    try {
      const ui = frame.contentWindow.__orbitaskUi;
      if (!ui || ui.__orbitaskPages) return;
      ui.__orbitaskPages = true;
      ui.editor.addListener('pageSelected', () => {
        editorPage = ui.currentPage && ui.currentPage.getId();
        const t = byPage(editorPage);
        if (t && t !== T) selectTicket(t.number, true);
        else if (currentView === 'editor') syncRoute(true);
        checkPage(ui);
      });
    } catch (e) { /* not critical */ }
  }

  // Warn if the request's page is missing or empty in the saved file (e.g. deleted by accident).
  function checkPage(ui) {
    try {
      const want = editorPage || T.page_id;
      const page = ui.pages && ui.pages.find(p => p.getId() === want);
      const empty = page && page === ui.currentPage && Object.keys(ui.editor.graph.model.cells).length <= 2;
      if (!page || empty) {
        setStatus(`The page for ${T.process.split(' ')[0]} is ${page ? 'empty' : 'missing'} in your file – `
          + "use 'Restore original' to get it back.", 'err');
      }
    } catch (e) { /* not critical */ }
  }

  // Jump to a page of the open diagram (used when switching between requests / showing a solution page).
  function goToPage(pageId) {
    editorPage = pageId;
    try {
      const ui = frame.contentWindow.__orbitaskUi;
      if (!ui || !ui.pages) return;
      const page = ui.pages.find(p => p.getId() === pageId);
      if (!page) { checkPage(ui); return; }
      if (page === ui.currentPage) return;
      ui.selectPage(page);
      setTimeout(() => fitPage(ui), 200);
    } catch (e) { /* not critical */ }
  }

  async function loadIntoEditor() {
    const xml = await api('/api/diagram');
    frame.contentWindow.postMessage(JSON.stringify({
      action: 'load', xml, autosave: 1, title: 'orbitask_as_is_processes.drawio', noSaveBtn: 1, noExitBtn: 1,
    }), '*');
  }

  window.addEventListener('message', e => {
    if (!frame || e.source !== frame.contentWindow || typeof e.data !== 'string') return;
    let msg;
    try { msg = JSON.parse(e.data); } catch (err) { return; }
    if (msg.event === 'init') { captureEditorUi(); loadIntoEditor(); }
    else if (msg.event === 'load') {
      editorReady = true;
      const l = document.querySelector('.frame-loading'); if (l) l.remove();
      openPanels();
      watchPages();
      goToPage(pendingPage || editorPage || T.page_id); pendingPage = null;
      setStatus(S.savedAt ? 'All changes saved · ' + hhmm(S.savedAt) : 'Ready – changes are saved automatically', 'ok');
      checkPage(frame.contentWindow.__orbitaskUi);
    } else if (msg.event === 'autosave' || msg.event === 'save') {
      if (msg.xml) queueSave(msg.xml, msg.event === 'save' ? 0 : 1000);
    }
  });

  function queueSave(xml, delay) {
    pendingXml = xml;
    setStatus('Unsaved changes…');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, delay);
  }

  async function flush() {
    clearTimeout(saveTimer);
    saveTimer = null;
    if (saving || pendingXml == null) return;
    const xml = pendingXml; pendingXml = null; saving = true;
    setStatus('Saving…');
    try {
      const r = await api('/api/diagram', { method: 'PUT', headers: { 'Content-Type': 'application/xml' }, body: xml });
      S.savedAt = r.savedAt;
      setStatus('All changes saved · ' + hhmm(r.savedAt), 'ok');
      if (pendingXml == null && frame) { // tell draw.io the file is saved (no "leave page?" prompt)
        frame.contentWindow.postMessage(JSON.stringify({ action: 'status', message: 'All changes saved',
                                                         modified: false }), '*');
      }
    } catch (err) {
      if (pendingXml == null) pendingXml = xml;
      setStatus('Not saved – retrying… (is the container still running?)', 'err');
      saveTimer = setTimeout(flush, 3000);
    } finally {
      saving = false;
      if (pendingXml != null && !saveTimer) saveTimer = setTimeout(flush, 500);
    }
  }

  async function flushNow() {
    for (let i = 0; i < 40 && (pendingXml != null || saving); i++) { await flush(); await sleep(150); }
  }

  window.addEventListener('beforeunload', e => {
    if (pendingXml != null || saving) { flush(); e.preventDefault(); e.returnValue = ''; }
  });

  $('#toggleBrief').addEventListener('click', () => $('.editor-body').classList.toggle('no-brief'));

  $('#handinBtn').addEventListener('click', async () => {
    await flushNow();
    const a = document.createElement('a');
    a.href = '/api/handin'; a.download = '';
    document.body.appendChild(a); a.click(); a.remove();
    const n = PRESENTER() ? 1 : TICKETS.length;
    setStatus(n > 1 ? `Hand-in file downloaded (${n} requests in one file) – give it to your teacher.`
      : 'Hand-in file downloaded – give it to your teacher.', 'ok');
  });

  function confirmDlg(title, text, okLabel) {
    return new Promise(resolve => {
      const d = $('#confirmDlg');
      $('#confirmTitle').textContent = title; $('#confirmText').textContent = text; $('#confirmOk').textContent = okLabel;
      d.returnValue = '';
      d.onclose = () => resolve(d.returnValue === 'ok');
      d.showModal();
    });
  }

  $('#restoreBtn').addEventListener('click', async () => {
    const ok = await confirmDlg('Restore the original file?',
      'All your changes in the editor will be replaced by the original as-is processes. '
      + 'A backup of your current work is kept inside the container.', 'Restore original');
    if (!ok) return;
    await flushNow();
    await post('/api/restore');
    if (frame && editorReady) await loadIntoEditor();
    setStatus('Original file restored', 'ok');
  });

  // ------------------------------------------------------------ boot
  async function boot() {
    S = await api('/api/session');
    S.seen = S.seen || {};
    TICKETS = S.tickets;
    T = null;
    selectTicket(S.primary);
    if (PRESENTER()) {
      document.body.classList.add('presenter');
      $('#railSolutions').hidden = false;
    }
    showTeam();
    // Requests delivered earlier but never opened stay unread after a reload.
    TICKETS.forEach(t => { if (!isSeen(t.number) && t.extra) unread.add(t.number); });
    updateBadges();
    if (PRESENTER()) { S._started = true; if (!applyRoute()) showView('solutions'); return; }
    if (!S.team && !isSeen(S.primary)) { showView('welcome'); $('#teamInput').focus(); return; }
    S._started = true;
    if (!isSeen(S.primary)) { showView('activity'); await sleep(1200); deliverNotification(byNo(S.primary)); return; }
    if (applyRoute()) return;
    currentChat = S.primary;
    showView('chat');
  }

  boot().catch(err => {
    document.body.innerHTML = '<p style="padding:24px;font-family:sans-serif">Could not reach the workshop server. '
      + 'Is the Docker container running?<br><small>' + String(err) + '</small></p>';
  });
})();
