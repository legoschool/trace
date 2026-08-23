/* 자리와 이름 · 사람이 드라이브에서 «옮기고 바꾸고 버릴» 때 앱이 어떻게 구는지 본다.

   앱과 드라이브 폴더 사이에서 어긋나는 것은 대개 «내용» 이 아니라 «자리와 이름» 이다.
   파일 하나를 다른 폴더로 끌어다 놓았을 뿐인데 길찾기 줄이 옛 자리를 가리키거나,
   드라이브에서 붙여 준 이름을 앱이 조용히 되돌려 놓거나, 아예 안 열리거나.

   그래서 여기서는 가짜 드라이브가 «진짜로» 움직인다.
   옮기라면 폴더 표에서 옮기고, 이름을 바꾸라면 바꾸고, 버리라면 버린다.
   그 위에서 열 가지 상황을 차례로 겪어 본다.

   설치할 것 없음: 노드에 들어 있는 WebSocket 만 쓴다.
   실행:  node docs/점검도구/자리와이름.mjs [url]
   --------------------------------------------------------- */
import { spawn } from "node:child_process";
import { mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const URL_ = (process.argv[2] || "http://localhost:8000/").replace(/\/?$/, "/");
const PORT = 9377;

const EDGE = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
].find(existsSync);
if (!EDGE) { console.error("엣지도 크롬도 찾지 못했습니다."); process.exit(2); }

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), "trace-place-"));
const edge = spawn(EDGE, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  "--window-size=1280,900", URL_,
], { stdio: "ignore" });

const results = [];
const errors = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok });
  console.log(`${ok ? "  OK  " : " FAIL "} ${name}${detail ? " · " + detail : ""}`);
}

/* ---------------------------------------------------------
   가짜 드라이브 · 작게, 그러나 «진짜로 움직이게»

   ROOT 내 폴더/
    ├ 2019/ 과학/
    │    ├ 물의 상태변화 학습지.hwp
    │    └ 수업사진.jpg
    └ 연수/
         └ 2019-05-02_경험_연수 다녀옴.md
   --------------------------------------------------------- */
const FAKE = `(function () {
  if (!sessionStorage.getItem('keep')) localStorage.clear();
  localStorage.setItem('trace.connected', '1');
  localStorage.setItem('trace.folder', JSON.stringify({ id: 'ROOT', name: '내 폴더', link: '' }));
  localStorage.setItem('trace.token.v1', JSON.stringify({ t: 'FAKE', exp: Date.now() + 3600000 }));
  localStorage.setItem('trace.email', 'teacher@example.com');

  var FOLDER = 'application/vnd.google-apps.folder';
  function f(id, name, mime) {
    return { id: id, name: name, mimeType: mime, size: '1234', trashed: false,
      createdTime: '2019-03-02T01:00:00.000Z', modifiedTime: '2020-06-01T01:00:00.000Z' };
  }
  // 파일 하나하나를 id 로 들고, 어느 폴더에 있는지는 parent 로 적는다. 진짜 드라이브와 같은 모양이다
  var FILES = {
    D2019:  f('D2019', '2019', FOLDER),
    DSCI:   f('DSCI', '과학', FOLDER),
    DYEONSU:f('DYEONSU', '연수', FOLDER),
    H1:     f('H1', '물의 상태변화 학습지.hwp', 'application/octet-stream'),
    P1:     f('P1', '수업사진.jpg', 'image/jpeg'),
    MD1:    f('MD1', '2019-05-02_경험_연수 다녀옴.md', 'text/markdown')
  };
  var PARENT = { D2019: 'ROOT', DSCI: 'D2019', DYEONSU: 'ROOT', H1: 'DSCI', P1: 'DSCI', MD1: 'DYEONSU' };

  var MD1TEXT = ['---','title: 연수 다녀옴','type: 경험','tags: [연수]','---','',
                 '# 연수 다녀옴','','오늘 연수를 다녀왔다.',''].join('\\n');
  var PNG8 = 'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGOo6FmAFTEMLQkA/SBpAUsyaigAAAAASUVORK5CYII=';

  /* 점검이 «사람 노릇» 을 할 수 있게 손잡이를 밖으로 낸다.
     여기서 부르는 것은 전부 «사람이 드라이브에서 하는 일» 이다. 앱은 이걸 못 본다. */
  window.__drive = {
    files: FILES, parent: PARENT,
    moved: [], renamed: [], trashed: [], created: [],
    move: function (id, to) { PARENT[id] = to; },
    rename: function (id, name) { FILES[id].name = name; },
    trash: function (id) { FILES[id].trashed = true; },
    untrash: function (id) { FILES[id].trashed = false; },
    nameOf: function (id) { return FILES[id] ? FILES[id].name : null; },
    parentOf: function (id) { return PARENT[id] || null; },
    reset: function () { window.__drive.moved = []; window.__drive.renamed = []; window.__drive.trashed = []; }
  };

  function kids(pid) {
    var out = [];
    for (var id in PARENT) if (PARENT[id] === pid && !FILES[id].trashed) out.push(FILES[id]);
    return out;
  }
  function J(o) {
    return Promise.resolve(new Response(JSON.stringify(o),
      { status: 200, headers: { 'Content-Type': 'application/json' } }));
  }
  var realFetch = window.fetch.bind(window);
  window.fetch = function (url, opts) {
    var u = String(url && url.url ? url.url : url);
    if (u.indexOf('googleapis.com') < 0) return realFetch(url, opts);
    var method = (opts && opts.method) || 'GET';
    if (u.indexOf('/userinfo') >= 0) return J({ email: 'teacher@example.com' });

    if (method !== 'GET') {
      var body = String((opts && opts.body) || '');
      var who = (/files\\/([\\w-]+)/.exec(u) || ['', ''])[1];
      // ① 올리기 · 새 파일이면 진짜로 만든다
      if (u.indexOf('/upload/') >= 0) {
        var nm = (/"name"\\s*:\\s*"([^"]*)"/.exec(body) || ['', ''])[1];
        if (who) {
          // 이미 있는 파일 덮어쓰기. 이름을 함께 보냈으면 «이름을 바꾼 것» 이다
          if (/"name"\\s*:/.test(body)) {
            window.__drive.renamed.push({ id: who, name: nm });
            if (FILES[who]) FILES[who].name = nm;
          }
          return J({ id: who, name: FILES[who] ? FILES[who].name : nm });
        }
        var pid = (/"parents"\\s*:\\s*\\["([^"]*)"\\]/.exec(body) || ['', 'ROOT'])[1];
        var nid = 'NEW' + (window.__drive.created.length + 1);
        FILES[nid] = f(nid, nm || '무제', 'text/markdown');
        PARENT[nid] = pid;
        window.__drive.created.push({ id: nid, name: nm, parent: pid });
        return J({ id: nid, name: nm });
      }
      // ② 폴더 만들기
      if (/"mimeType"\\s*:\\s*"application\\/vnd.google-apps.folder"/.test(body)) {
        var fn = (/"name"\\s*:\\s*"([^"]*)"/.exec(body) || ['', '새 폴더'])[1];
        var fp = (/"parents"\\s*:\\s*\\["([^"]*)"\\]/.exec(body) || ['', 'ROOT'])[1];
        var fid = 'F' + (window.__drive.created.length + 1) + Math.floor(Math.random() * 1000);
        FILES[fid] = f(fid, fn, FOLDER); PARENT[fid] = fp;
        window.__drive.created.push({ id: fid, name: fn, parent: fp });
        return J({ id: fid, name: fn });
      }
      // ③ 버리기 · 옮기기 · 이름 바꾸기 · 전부 진짜로 반영한다
      if (/"trashed"\\s*:\\s*true/.test(body)) {
        window.__drive.trashed.push(who);
        if (FILES[who]) FILES[who].trashed = true;
        return J({ id: who });
      }
      if (u.indexOf('addParents=') >= 0) {
        var to = (/addParents=([^&]*)/.exec(u) || ['', ''])[1];
        window.__drive.moved.push({ id: who, to: to });
        if (FILES[who]) PARENT[who] = to;
        return J({ id: who });
      }
      if (/"name"\\s*:/.test(body)) {
        var rn = (/"name"\\s*:\\s*"([^"]*)"/.exec(body) || ['', ''])[1];
        window.__drive.renamed.push({ id: who, name: rn });
        if (FILES[who]) FILES[who].name = rn;
        return J({ id: who, name: rn });
      }
      return J({ id: who || 'OK' });
    }

    if (u.indexOf('alt=media') >= 0) {
      var mm = /files\\/([\\w-]+)\\?/.exec(u);
      var w2 = mm ? mm[1] : '';
      if (w2 === 'MD1') return Promise.resolve(new Response(MD1TEXT, { status: 200 }));
      var bin = atob(PNG8), arr = new Uint8Array(bin.length);
      for (var bi = 0; bi < bin.length; bi++) arr[bi] = bin.charCodeAt(bi);
      return Promise.resolve(new Response(arr, { status: 200, headers: { 'Content-Type': 'image/png' } }));
    }
    if (u.indexOf('/files?') < 0) {
      var mv = /files\\/([\\w-]+)\\?/.exec(u);
      var fid2 = mv ? mv[1] : 'ROOT';
      if (fid2 === 'ROOT') return J({ id: 'ROOT', name: '내 폴더', mimeType: FOLDER });
      if (!FILES[fid2] || FILES[fid2].trashed) {
        return Promise.resolve(new Response(JSON.stringify({ error: { code: 404 } }), { status: 404 }));
      }
      var one = FILES[fid2];
      return J({ id: one.id, name: one.name, mimeType: one.mimeType, parents: [PARENT[fid2]] });
    }
    var q = decodeURIComponent((/[?&]q=([^&]*)/.exec(u) || ['', ''])[1]);
    if (q.indexOf('name=') >= 0 || q.indexOf('name contains') >= 0) return J({ files: [] });
    var mp = /'([\\w-]+)' in parents/.exec(q);
    if (!mp) return J({ files: [] });
    return J({ files: kids(mp[1]) });
  };
})()`;

/* ---------------- CDP ---------------- */
let ws, msgId = 0;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((res, rej) => { const id = ++msgId; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};

let u;
for (let i = 0; i < 60 && !u; i++) {
  try {
    const l = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json());
    u = l.find((t) => t.type === "page" && t.webSocketDebuggerUrl)?.webSocketDebuggerUrl;
  } catch {}
  if (!u) await wait(250);
}
if (!u) { console.error("브라우저에 못 붙었습니다."); edge.kill(); process.exit(3); }
ws = new WebSocket(u);
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id); pending.delete(m.id);
    m.error ? rej(new Error(m.error.message)) : res(m.result); return;
  }
  if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errors.push(m.params.args.map((a) => a.value ?? a.description).join(" "));
};
await new Promise((r) => (ws.onopen = r));
await send("Runtime.enable");
await send("Page.enable");
await send("Page.addScriptToEvaluateOnNewDocument", { source: FAKE });
await send("Page.reload");
await wait(2600);

/* ---------------- 사람 노릇 하는 손 ---------------- */
const closeModals = () => ev(`(() => { document.querySelectorAll('.modal-bg').forEach(b => b.remove()); return true; })()`);

async function runImport() {
  await closeModals();
  await ev(`document.getElementById('btnSettings').click(); true`);
  await wait(400);
  await ev(`(() => {
    const t = Array.from(document.querySelectorAll('.tabs .tab')).find(x => (x.textContent||'').includes('가져오기'));
    if (t) t.click(); return true;
  })()`);
  await wait(350);
  const pressed = await ev(`(() => {
    const b = Array.from(document.querySelectorAll('button')).find(b => (b.textContent||'').includes('폴더 훑어서 가져오기'));
    if (!b) return 'NO_BUTTON';
    if (b.disabled) return 'DISABLED';
    b.click(); return 'CLICKED';
  })()`);
  // 자료를 물어보면 «가져오기» 로 답한다 (안 물어보면 새로 들어올 것이 없다는 뜻)
  for (let i = 0; i < 30; i++) {
    await wait(400);
    const asked = await ev(`(() => {
      const m = Array.from(document.querySelectorAll('.card.modal')).find(x => (x.textContent||'').includes('자료도 함께'));
      if (!m) return false;
      const b = Array.from(m.querySelectorAll('button')).find(b => b.textContent === '가져오기');
      if (b) b.click();
      return true;
    })()`);
    if (asked) break;
    const done = await ev(`(() => {
      const s = Array.from(document.querySelectorAll('.mbody')).map(x => x.textContent).join(' ');
      return /훑었습니다|가져왔습니다|색인에 넣었습니다/.test(s);
    })()`);
    if (done) break;
  }
  await wait(2200);
  await closeModals();
  await wait(300);
  return pressed;
}

/* 카드의 «✏️ 편집» 은 화면 맨 위 «쓰는 자리» 로 기록을 올려 놓는다.
   저장 단추는 그때 이름이 «수정 저장» 으로 바뀐다. */
/* 카드의 «✏️ 편집» 은 화면 맨 위 «쓰는 자리» 로 기록을 올려 놓는다.
   저장 단추는 그때 이름이 «수정 저장» 으로 바뀐다. */
const openEditor = () => ev(`(() => {
  const c = document.querySelector('.card.entry');
  if (!c) return 'NO_CARD';
  const b = Array.from(c.querySelectorAll('button')).find(x => (x.textContent||'').includes('편집'));
  if (!b) return 'NO_EDIT[' + Array.from(c.querySelectorAll('button')).map(x => x.textContent).join('|') + ']';
  b.click(); return 'OPEN';
})()`);
const pressSave = () => ev(`(() => {
  const b = document.getElementById('btnSave');
  if (!b || b.disabled) return 'NO_SAVE';
  b.click(); return 'SAVED';
})()`);
const entryBy = (srcId) => ev(`(() => {
  const L = JSON.parse(localStorage.getItem('trace.entries.v2') || '[]');
  const e = L.find(x => x.srcId === '${srcId}' || x.mdId === '${srcId}');
  return JSON.stringify(e ? { id: e.id, title: e.title, path: e.srcPath || [], mdId: e.mdId || '', mdName: e.mdName || '' } : null);
})()`).then((s) => JSON.parse(s));

const setSearch = (text) => ev(
  "(() => { const q = document.getElementById('search'); q.value = " + JSON.stringify(text) +
  "; q.dispatchEvent(new Event('input', { bubbles: true })); return true; })()");
/* 목록에서 그 한 편만 남기고 본다. 카드가 안 그려지면 «안 보임» 알림도 안 그려진다 */
const crumbOf = async (title) => {
  await setSearch('');
  await wait(200);
  await setSearch(title);
  await wait(700);
  return ev(`(() => {
    const cards = Array.from(document.querySelectorAll('.card.entry'));
    return JSON.stringify({
      crumbs: cards.map(c => Array.from(c.querySelectorAll('.crumb')).map(x => x.textContent).join('/')).join(' | '),
      gone: document.querySelectorAll('.banner.gone').length,
      cards: cards.length
    });
  })()`).then((x) => JSON.parse(x));
};

/* =========================================================
   상황 ⓪ · 먼저 십삼 년치를 끌어온다
   ========================================================= */
const first = await runImport();
check("① 폴더를 훑어 가져온다", first === "CLICKED", String(first));
const hwp0 = await entryBy("H1");
check("① 거쳐 온 길이 그대로 적힌다", !!hwp0 && hwp0.path.join("/") === "2019/과학",
  hwp0 ? hwp0.path.join(" › ") : "기록이 안 섰다");
const md0 = await entryBy("MD1");
check("① 글(.md)은 안을 읽어 되살린다", !!md0 && md0.title === "연수 다녀옴", md0 ? md0.title : "없음");

/* =========================================================
   상황 ② · 사람이 파일을 다른 폴더로 끌어다 놓는다
   ========================================================= */
await ev(`window.__drive.reset(); window.__drive.move('H1', 'DYEONSU'); true`);
await runImport();
const hwp1 = await entryBy("H1");
check("② 옮기면 앱이 그 자리를 따라온다", !!hwp1 && hwp1.path.join("/") === "연수",
  hwp1 ? hwp1.path.join(" › ") || "(뿌리)" : "없음");
const moved1 = await ev(`JSON.stringify(window.__drive.moved)`);
check("② 따라오면서 원본을 되돌려 놓지 않는다", moved1 === "[]", moved1);

/* =========================================================
   상황 ③ · 사람이 폴더 이름을 바꾼다
   ========================================================= */
await ev(`window.__drive.reset(); window.__drive.rename('DYEONSU', '2019 연수'); true`);
await runImport();
const hwp2 = await entryBy("H1");
check("③ 폴더 이름을 바꾸면 길도 새 이름이 된다", !!hwp2 && hwp2.path.join("/") === "2019 연수",
  hwp2 ? hwp2.path.join(" › ") : "없음");

/* =========================================================
   상황 ④ · 사람이 폴더를 통째로 다른 폴더 안으로 옮긴다
   ========================================================= */
await ev(`window.__drive.reset(); window.__drive.move('DYEONSU', 'D2019'); true`);
await runImport();
const hwp3 = await entryBy("H1");
check("④ 폴더째 옮기면 그 안의 것도 다 따라온다", !!hwp3 && hwp3.path.join("/") === "2019/2019 연수",
  hwp3 ? hwp3.path.join(" › ") : "없음");

/* =========================================================
   상황 ⑤ · 사람이 드라이브에서 파일 이름을 바꾼다
   앱이 제 이름으로 되돌려 놓으면, 사람이 붙인 이름이 사라진다
   ========================================================= */
await ev(`window.__drive.reset(); window.__drive.rename('MD1', '연수 정리본.md'); true`);
await runImport();
// 그 기록을 한 번 고쳐 저장시킨다 · 저장이 이름을 되돌리는지 보는 자리다
await ev(`(() => {
  const L = JSON.parse(localStorage.getItem('trace.entries.v2') || '[]');
  return L.length;
})()`);
await setSearch('연수 다녀옴');
await wait(700);
const edited = await openEditor();
await wait(900);
const saved = await pressSave();
await wait(3000);
await closeModals();
const renamed5 = await ev(`JSON.stringify(window.__drive.renamed)`);
const nameNow = await ev(`window.__drive.nameOf('MD1')`);
check("⑤ 고쳐 놓은 기록을 열어 저장할 수 있다", edited === "OPEN" && saved === "SAVED", `${edited} / ${saved}`);
check("⑤ 드라이브에서 바꾼 이름을 앱이 되돌리지 않는다", nameNow === "연수 정리본.md",
  `지금 이름: ${nameNow} · 바꾼 기록 ${renamed5}`);

/* =========================================================
   상황 ⑥ · 앱에서 제목을 바꿔도, 밖에서 온 원본 이름은 사람 것이다
   («앱이 만든 것» 과 «밖에서 온 것» 을 가르는 자리다. 자리 규칙과 같다)
   ========================================================= */
await ev(`window.__drive.reset(); true`);
const retitled = await openEditor();
await wait(900);
await ev(`(() => {
  const t = document.getElementById('title');
  if (!t) return false;
  t.value = '연수 다녀와서 남긴 것';
  t.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
})()`);
await wait(300);
await pressSave();
await wait(3000);
await closeModals();
const nameAfterTitle = await ev(`window.__drive.nameOf('MD1')`);
check("⑥ 제목을 바꿔도 밖에서 온 원본 이름은 그대로다",
  retitled === "OPEN" && nameAfterTitle === "연수 정리본.md",
  `지금 이름: ${nameAfterTitle}`);

/* =========================================================
   상황 ⑥-2 · 앱이 «만든» 기록은 이름 규칙을 따라야 한다
   («안 건드린다» 가 «영영 안 바꾼다» 가 되면, 이름 규칙 기능이 죽는다)
   ========================================================= */
await ev(`window.__drive.reset(); true`);
await setSearch('');
await wait(400);
const wrote = await ev(`(() => {
  document.getElementById('title').value = '앱에서 새로 쓴 것';
  document.getElementById('title').dispatchEvent(new Event('input', { bubbles: true }));
  const ta = document.querySelector('#blocks textarea, .block textarea, textarea');
  if (ta) { ta.value = '본문 한 줄.'; ta.dispatchEvent(new Event('input', { bubbles: true })); }
  const b = document.getElementById('btnSave');
  if (!b || b.disabled) return 'NO_SAVE';
  b.click(); return 'SAVED';
})()`);
await wait(3500);
await closeModals();
const madeName = await ev(`(() => {
  const made = window.__drive.created.filter(c => /앱에서 새로 쓴 것/.test(c.name || ''));
  return made.length ? made[made.length - 1].id : '';
})()`);
check("⑥-2 앱이 만든 기록은 이름 규칙대로 파일이 선다", wrote === "SAVED" && !!madeName,
  madeName ? await ev(`window.__drive.nameOf('${madeName}')`) : "안 만들어짐");

await ev(`window.__drive.reset(); true`);
await setSearch('앱에서 새로 쓴 것');
await wait(700);
const retitle2 = await openEditor();
await wait(800);
await ev(`(() => {
  const t = document.getElementById('title');
  t.value = '앱에서 새로 쓴 것 · 고친 제목';
  t.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
})()`);
await wait(300);
await pressSave();
await wait(3500);
await closeModals();
const madeNameNow = madeName ? await ev(`window.__drive.nameOf('${madeName}')`) : "";
check("⑥-2 앱이 만든 기록은 제목을 바꾸면 파일 이름도 따라간다",
  retitle2 === "OPEN" && /고친 제목/.test(String(madeNameNow)), `지금 이름: ${madeNameNow}`);

/* =========================================================
   상황 ⑦ · 사람이 파일을 연결한 폴더 «밖» 으로 꺼낸다
   이 앱의 권한(drive.file)으로는 아예 안 보인다. 조용히 안 열리면 안 된다
   ========================================================= */
await ev(`window.__drive.reset(); window.__drive.move('H1', 'OUTSIDE'); true`);
await runImport();
const seen7 = await crumbOf("물의 상태변화 학습지");
check("⑦ 폴더 밖으로 나가면 안 보인다고 말한다", seen7.gone > 0, `알림 ${seen7.gone}곳 · 카드 ${seen7.cards}장`);

/* =========================================================
   상황 ⑧ · 도로 넣으면 «안 보임» 이 걷혀야 한다
   ========================================================= */
await ev(`window.__drive.reset(); window.__drive.move('H1', 'DSCI'); true`);
await runImport();
const seen8 = await crumbOf("물의 상태변화 학습지");
const hwp8 = await entryBy("H1");
check("⑧ 도로 넣으면 다시 보인다", seen8.gone === 0, `알림 ${seen8.gone}곳`);
check("⑧ 자리도 돌아온 자리로 다시 잡는다", !!hwp8 && hwp8.path.join("/") === "2019/과학",
  hwp8 ? hwp8.path.join(" › ") : "없음");

/* =========================================================
   상황 ⑨ · 사람이 드라이브에서 파일을 휴지통에 버린다
   ========================================================= */
await ev(`window.__drive.reset(); window.__drive.trash('P1'); true`);
await runImport();
const seen9 = await crumbOf("수업사진");
check("⑨ 휴지통에 버린 것도 안 보인다고 말한다", seen9.gone > 0, `알림 ${seen9.gone}곳 · 카드 ${seen9.cards}장`);

/* =========================================================
   상황 ⑩ · 되돌리면 다시 보인다
   ========================================================= */
await ev(`window.__drive.reset(); window.__drive.untrash('P1'); true`);
await runImport();
const seen10 = await crumbOf("수업사진");
check("⑩ 휴지통에서 꺼내면 다시 보인다", seen10.gone === 0, `알림 ${seen10.gone}곳`);

/* =========================================================
   상황 ⑪ · 가져온 기록을 목록에서 빼도, 드라이브의 원본은 남아야 한다
   목록에서 빼는 것과 파일을 버리는 것은 전혀 다른 일이다
   ========================================================= */
await ev(`window.__drive.reset(); true`);
await setSearch('연수 다녀와서 남긴 것');
await wait(700);
const asked = await ev(`(() => {
  const c = document.querySelector('.card.entry');
  if (!c) return 'NO_CARD';
  const b = Array.from(c.querySelectorAll('button')).find(x => (x.textContent||'').includes('삭제') || (x.textContent||'').includes('지우'));
  if (!b) return 'NO_DEL[' + Array.from(c.querySelectorAll('button')).map(x => x.textContent).join('|') + ']';
  b.click(); return 'ASKED';
})()`);
await wait(700);
const warned = await ev(`(() => {
  const m = Array.from(document.querySelectorAll('.card.modal')).find(x => (x.textContent||'').includes('삭제할까요'));
  return m ? (m.textContent || '') : '';
})()`);
check("⑪ 지우기 전에 «원본은 남는다» 고 말해 준다", /원본 파일은 그대로/.test(String(warned)),
  String(warned).replace(/\s+/g, ' ').slice(0, 60) || `${asked}`);
await ev(`(() => {
  const m = Array.from(document.querySelectorAll('.card.modal')).find(x => (x.textContent||'').includes('삭제할까요'));
  if (!m) return false;
  const b = Array.from(m.querySelectorAll('button')).find(x => /삭제|확인|예/.test(x.textContent||''));
  if (b) b.click(); return true;
})()`);
await wait(2500);
await closeModals();
const trashed11 = await ev(`JSON.stringify(window.__drive.trashed)`);
const stillThere = await ev(`window.__drive.nameOf('MD1')`);
check("⑪ 목록에서 빼도 드라이브 원본은 안 버린다",
  trashed11 === "[]" && stillThere === "연수 정리본.md", `버린 것 ${trashed11} · 원본 ${stillThere}`);
await setSearch('');
await wait(400);

/* =========================================================
   내내 · 사람이 시키지 않은 옮기기·버리기는 한 번도 없어야 한다
   ========================================================= */
const finalMoved = await ev(`JSON.stringify(window.__drive.moved)`);
const finalTrashed = await ev(`JSON.stringify(window.__drive.trashed)`);
check("내내 앱이 제멋대로 옮기지 않았다", finalMoved === "[]", finalMoved);
check("내내 앱이 제멋대로 버리지 않았다", finalTrashed === "[]", finalTrashed);

const realErrors = errors.filter((e) => !/GSI_LOGGER|popup|ERR_INTERNET|ERR_NAME|gsi\/client|404/i.test(String(e)));
check("옮기고 바꾸고 버리는 내내 오류 없음", realErrors.length === 0, realErrors[0] || "");

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} 통과`);
edge.kill();
process.exit(failed.length ? 1 : 0);
