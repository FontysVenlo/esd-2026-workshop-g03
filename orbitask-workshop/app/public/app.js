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
  let T = null;              // assigned ticket
  let unread = false;
  let currentView = null;
  let currentChat = 'manager';
  let animating = false;

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
    if (name !== 'welcome' && S && !S.team && !S.chatSeen && !S._started) name = 'welcome';
    document.querySelectorAll('.view').forEach(v => { v.hidden = v.id !== 'view-' + name; });
    document.querySelectorAll('.rail-btn').forEach(b => b.classList.toggle('active', b.dataset.view === name));
    currentView = name;
    if (name === 'chat') openChat(currentChat);
    if (name === 'editor') ensureEditor();
    if (name === 'activity') renderActivity();
  }

  document.querySelectorAll('.rail-btn').forEach(b => b.addEventListener('click', () => showView(b.dataset.view)));

  function avatar(name, color, initials) {
    const a = el('span', 'avatar', initials);
    a.style.background = color;
    a.title = name;
    return a;
  }

  function setUnread(on) {
    unread = on;
    $('#badgeChat').hidden = !on;
    $('#badgeActivity').hidden = !on;
    document.title = (on ? '(1) ' : '') + 'Orbitask Connect';
    renderChatList();
  }

  // ------------------------------------------------------------ welcome + notification
  $('#startBtn').addEventListener('click', start);
  $('#teamInput').addEventListener('keydown', e => { if (e.key === 'Enter') start(); });

  async function start() {
    const team = $('#teamInput').value.trim();
    if (!team) { $('#teamInput').focus(); $('#teamInput').placeholder = 'Please enter your names or group name'; return; }
    await post('/api/team', { team });
    S.team = team; S._started = true;
    showTeam();
    showView('activity');
    await sleep(2500);
    deliverNotification();
  }

  function showTeam() {
    const l = $('#teamLabel');
    l.textContent = S.team; l.hidden = !S.team; l.title = S.team;
  }

  function deliverNotification() {
    setUnread(true);
    renderActivity();
    const t = $('#toast');
    t.innerHTML = '';
    t.appendChild(avatar(T.from_name, T.color, T.initials));
    const box = el('div');
    box.appendChild(el('div', 't-app', 'Orbitask Connect · now'));
    const who = el('b', null, T.from_name);
    box.appendChild(who);
    box.appendChild(el('div', 't-body', T.script[0].text));
    t.appendChild(box);
    t.hidden = false;
    t.onclick = () => { t.hidden = true; currentChat = 'manager'; showView('chat'); };
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
    if (!S.chatSeen && !unread) {
      const w = el('div', 'waiting');
      w.appendChild(el('div', null, 'No activity yet.'));
      w.appendChild(el('small', null, 'Waiting for messages from your colleagues…'));
      list.appendChild(w);
      return;
    }
    const item = el('button', 'activity-item' + (unread ? ' unread' : ''));
    item.appendChild(avatar(T.from_name, T.color, T.initials));
    const txt = el('div');
    const b = el('b', null, `${T.from_name} sent you a message`);
    txt.appendChild(b);
    txt.appendChild(el('small', null, `${T.from_role} · ${T.title}`));
    item.appendChild(txt);
    item.onclick = () => { currentChat = 'manager'; showView('chat'); };
    list.appendChild(item);
  }

  // ------------------------------------------------------------ chat
  function renderChatList() {
    const it = $('#chatItemManager');
    it.innerHTML = '';
    it.appendChild(avatar(T.from_name, T.color, T.initials));
    const tx = el('span', 'ci-text');
    const b = el('b', unread ? 'unread' : null, T.from_name);
    tx.appendChild(b);
    tx.appendChild(el('small', null, S.chatSeen || unread ? T.script[0].text : T.from_role));
    it.appendChild(tx);
    document.querySelectorAll('.chat-item').forEach(c => c.classList.toggle('active', c.dataset.chat === currentChat));
  }
  document.querySelectorAll('.chat-item').forEach(c => c.addEventListener('click', () => openChat(c.dataset.chat)));

  function convHead(kind) {
    const h = $('#convHead');
    h.innerHTML = '';
    if (kind === 'guide') {
      const a = el('span', 'avatar bot', '?');
      h.appendChild(a);
      const w = el('div', 'who'); w.appendChild(el('b', null, 'Workshop guide'));
      w.appendChild(el('small', null, 'Automatic assistant')); h.appendChild(w);
      return;
    }
    h.appendChild(avatar(T.from_name, T.color, T.initials));
    const w = el('div', 'who');
    w.appendChild(el('b', null, T.from_name));
    w.appendChild(el('small', null, `${T.from_role} · ticket ${T.id}`));
    h.appendChild(w);
    const p = el('span', 'prio', T.priority.toUpperCase());
    p.style.background = PRIO_COLOR[T.priority] || '#555';
    h.appendChild(p);
  }

  function groupFor(who, time, mine) {
    const g = el('div', 'msg-group' + (mine ? ' mine' : ''));
    if (!mine) g.appendChild(who === 'guide' ? el('span', 'avatar bot', '?') : avatar(T.from_name, T.color, T.initials));
    const col = el('div', 'bubbles');
    const meta = el('div', 'msg-meta');
    meta.appendChild(el('b', null, mine ? (S.team || 'You') : (who === 'guide' ? 'Workshop guide' : T.from_name)));
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
      const btn = el('button', null, 'Open in the process editor');
      btn.onclick = () => showView('editor');
      card.appendChild(btn);
      b.appendChild(card);
    }
    return b;
  }

  function scrollDown() { const m = $('#messages'); m.scrollTop = m.scrollHeight; }

  function ackText(index) {
    return index === 0 ? T.ack : 'Noted, thanks for the update!';
  }

  function renderReplies() {
    S.replies.forEach((r, i) => {
      groupFor('me', r.at, true).appendChild(el('div', 'bubble', r.text));
      groupFor('manager', r.at, false).appendChild(el('div', 'bubble', ackText(i)));
    });
  }

  async function openChat(kind) {
    currentChat = kind;
    renderChatList();
    if (currentView !== 'chat') { showView('chat'); return; }
    convHead(kind);
    const msgs = $('#messages');
    msgs.innerHTML = '';
    const composer = $('#composer');
    if (kind === 'guide') {
      composer.classList.add('disabled');
      const col = groupFor('guide', S.createdAt, false);
      col.appendChild(bubbleFor({ type: 'text', text: 'Hi! I explain how this workshop works.' }));
      col.appendChild(bubbleFor({ type: 'list', intro: 'How to work:', items: S.guide.tips }));
      col.appendChild(bubbleFor({ type: 'list', intro: 'Rules from Orbitask management:', items: S.guide.constraints }));
      return;
    }
    if (!S.chatSeen && !unread) { // nothing received yet
      composer.classList.add('disabled');
      msgs.appendChild(el('div', 'waiting', 'No messages yet.'));
      return;
    }
    composer.classList.remove('disabled');
    if (!S.chatSeen) {
      if (animating) return;
      animating = true;
      composer.classList.add('disabled');
      setUnread(false);
      $('#toast').hidden = true;
      const col = groupFor('manager', new Date(), false);
      for (const item of T.script) {
        const typing = el('div', 'bubble typing');
        typing.innerHTML = '<i></i><i></i><i></i>';
        col.appendChild(typing); scrollDown();
        const len = (item.text || item.intro || '').length + (item.items ? item.items.join(' ').length : 0);
        await sleep(Math.min(2600, 700 + len * 9));
        typing.replaceWith(bubbleFor(item)); scrollDown();
        await sleep(350);
      }
      S.chatSeen = true;
      animating = false;
      composer.classList.remove('disabled');
      post('/api/seen');
      renderChatList();
      $('#replyInput').focus();
      return;
    }
    setUnread(false);
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
    if (!text || currentChat !== 'manager' || !S.chatSeen) return;
    input.value = '';
    const r = await post('/api/reply', { text });
    S.replies = r.replies;
    const idx = S.replies.length - 1;
    groupFor('me', S.replies[idx].at, true).appendChild(el('div', 'bubble', text));
    scrollDown();
    await sleep(900);
    const col = groupFor('manager', new Date(), false);
    const typing = el('div', 'bubble typing'); typing.innerHTML = '<i></i><i></i><i></i>';
    col.appendChild(typing); scrollDown();
    await sleep(1600);
    typing.replaceWith(el('div', 'bubble', ackText(idx)));
    scrollDown();
  }

  // ------------------------------------------------------------ guide page
  function renderGuide() {
    const g = $('#guide');
    g.innerHTML = '';
    g.appendChild(el('h1', null, 'Workshop guide'));
    g.appendChild(el('p', null, 'You are a business-process consultant at Orbitask. A manager sent you a request in the chat. '
      + 'Analyse the as-is process, design a better to-be process in BPMN and propose the IT tools that make it possible.'));
    const c1 = el('div', 'card'); c1.appendChild(el('h2', null, 'How to work'));
    const ol = el('ol'); S.guide.tips.forEach(t => ol.appendChild(el('li', null, t))); c1.appendChild(ol); g.appendChild(c1);
    const c2 = el('div', 'card'); c2.appendChild(el('h2', null, 'Rules from Orbitask management'));
    const ul = el('ul'); S.guide.constraints.forEach(t => ul.appendChild(el('li', null, t))); c2.appendChild(ul); g.appendChild(c2);
    const c3 = el('div', 'card'); c3.appendChild(el('h2', null, 'Handing in'));
    c3.appendChild(el('p', null, 'Click "Hand in (download)" in the process editor. You get one .drawio file with your diagrams '
      + 'and an extra page containing your written replies to the manager. Give that file to your teacher.'));
    g.appendChild(c3);
  }

  // ------------------------------------------------------------ editor (draw.io embed)
  let frame = null, editorReady = false, pendingXml = null, saving = false, saveTimer = null;

  function renderBrief() {
    const b = $('#brief');
    b.innerHTML = '';
    b.appendChild(el('small', 'muted', `${T.id} · ${T.priority} priority`));
    b.appendChild(el('h2', null, T.title));
    const from = el('div', 'from');
    from.appendChild(avatar(T.from_name, T.color, T.initials));
    const fw = el('div'); fw.appendChild(el('b', null, T.from_name)); fw.appendChild(el('small', null, T.from_role));
    from.appendChild(fw); b.appendChild(from);
    b.appendChild(el('h3', null, 'Process & scope'));
    b.appendChild(el('div', null, `${T.process}. ${T.scope}.`));
    T.script.filter(i => i.type === 'list').forEach(i => {
      b.appendChild(el('h3', null, i.intro.replace(/:$/, '')));
      const ul = el('ul'); i.items.forEach(x => ul.appendChild(el('li', null, x))); b.appendChild(ul);
    });
    const link = el('button', 'ghost', 'Open the chat');
    link.style.marginTop = '14px';
    link.onclick = () => { currentChat = 'manager'; showView('chat'); };
    b.appendChild(link);
  }

  function setStatus(text, cls) {
    const s = $('#saveStatus');
    s.textContent = text; s.className = 'save-status' + (cls ? ' ' + cls : '');
  }

  function ensureEditor() {
    if (frame) return;
    if (window.innerWidth < 1600) $('.editor-body').classList.add('no-brief');
    const params = new URLSearchParams({
      embed: '1', proto: 'json', spin: '1', noExitBtn: '1', noSaveBtn: '1', saveAndExit: '0',
      libraries: '1', libs: 'general;bpmn2', ui: 'kennedy', stealth: '1', pwa: '0', lang: 'en', 'page-id': T.page_id,
    });
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
      setTimeout(() => { try { ui.actions.get('fitWindow').funct(); } catch (e) { /* ignore */ } }, 300);
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
      setStatus(S.savedAt ? 'All changes saved · ' + hhmm(S.savedAt) : 'Ready – changes are saved automatically', 'ok');
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
    setStatus('Hand-in file downloaded – give it to your teacher.', 'ok');
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
    T = S.ticket;
    $('#ticketChip').textContent = `${T.id} · ${T.process}`;
    renderBrief();
    renderGuide();
    renderChatList();
    showTeam();
    if (!S.team && !S.chatSeen) { showView('welcome'); $('#teamInput').focus(); return; }
    S._started = true;
    if (!S.chatSeen) { showView('activity'); await sleep(1200); deliverNotification(); return; }
    showView('chat');
  }

  boot().catch(err => {
    document.body.innerHTML = '<p style="padding:24px;font-family:sans-serif">Could not reach the workshop server. '
      + 'Is the Docker container running?<br><small>' + String(err) + '</small></p>';
  });
})();
