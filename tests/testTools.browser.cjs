// M3.11：隔离静态构建与模拟 API。不会连接业务服务器或写入数据库。
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const build = path.resolve(__dirname, '../node_modules/.cache/m311-check');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'm311-browser-'));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let enabled = true, conflict = false, listFails = false, browser, socket;
const writes = [], queries = [], exceptions = [];
const users = [
  { id: 42, phone: '13800000042', current_role: 'electrician', status: 'active', openid: 'old-value' },
  { id: 43, phone: null, current_role: 'user', status: 'converted_to_electrician', openid: null },
  { id: 44, phone: '13800000044', current_role: 'enterprise', status: 'banned', openid: 'other-value' }
];
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    let data = {}, status = 200, message = 'ok';
    if (url.pathname.endsWith('/test-tools/capabilities')) data = { wechatIdEditEnabled: enabled, smsTestEnabled: enabled };
    else if (req.method === 'PUT' && /\/test-tools\/users\/\d+\/openid$/.test(url.pathname)) {
      let raw = ''; for await (const chunk of req) raw += chunk;
      const body = JSON.parse(raw), id = Number(url.pathname.match(/users\/(\d+)/)[1]); writes.push({ id, ...body });
      const user = users.find(row => row.id === id);
      if (!enabled) { status = 403; message = '仅在测试环境可使用'; }
      else if (conflict || (user.openid !== body.expectedOpenid && user.openid !== body.openid)) { status = 409; message = '微信ID已被更新，请重新加载后再保存'; }
      else { user.openid = body.openid === '' ? null : body.openid; data = { id, openid: user.openid, changed: true }; }
    } else if (url.pathname === '/api/admin/users') {
      queries.push(Object.fromEntries(url.searchParams));
      if (listFails) { status = 500; message = 'isolated offline'; }
      else {
        const selected = users.filter(row => (!url.searchParams.get('role') || row.current_role === url.searchParams.get('role'))
          && (!url.searchParams.get('status') || row.status === url.searchParams.get('status'))
          && (!url.searchParams.get('search') || (row.phone || '').includes(url.searchParams.get('search'))));
        data = { users: selected, total: selected.length };
      }
    } else if (/\/admin\/users\/\d+$/.test(url.pathname)) data = users.find(row => row.id === Number(url.pathname.split('/').at(-1)));
    else if (url.pathname.endsWith('/auth/info')) data = { id: 91, username: 'isolated-admin', real_name: '测试管理员' };
    else if (url.pathname === '/api/admin/admins') data = { admins: [], total: 0 };
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({ code: status, data, message }));
  }
  const relative = decodeURIComponent(url.pathname).replace(/^\/+/, ''), requested = path.resolve(build, relative || 'index.html');
  if (requested !== build && !requested.startsWith(build + path.sep)) { res.writeHead(403); return res.end(); }
  const file = fs.existsSync(requested) && fs.statSync(requested).isFile() ? requested : path.join(build, 'index.html');
  res.setHeader('Content-Type', ({ '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' })[path.extname(file)] || 'text/html');
  res.end(fs.readFileSync(file));
});
async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  browser = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--remote-debugging-port=0', '--window-size=1440,1000', '--user-data-dir=' + profile, 'about:blank'
  ], { stdio: 'ignore', windowsHide: true });
  const active = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; !fs.existsSync(active) && i < 100; i++) await pause(100);
  const port = fs.readFileSync(active, 'utf8').split('\n')[0];
  const pages = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
  socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
  await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
  let seq = 0; const pending = new Map();
  socket.addEventListener('message', event => {
    const item = JSON.parse(event.data);
    if (item.method === 'Runtime.exceptionThrown') exceptions.push(item.params.exceptionDetails.text);
    if (item.id) { const handler = pending.get(item.id); if (handler) { pending.delete(item.id); item.error ? handler.reject(item.error) : handler.resolve(item.result); } }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails)); return result.result.value;
  };
  const waitFor = async expression => {
    for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await pause(100); }
    throw Error('Timed out: ' + expression + '\n' + await evaluate('document.body.innerText'));
  };
  const click = async (text, scope = 'document') => {
    const found = await evaluate(`(()=>{const el=[...${scope}.querySelectorAll('button')].find(el=>el.innerText.trim()===${JSON.stringify(text)} && el.getClientRects().length); if(!el)return false;el.click();return true})()`);
    assert(found, 'button not found: ' + text);
  };
  const dialog = `[...document.querySelectorAll('[role="dialog"]')].find(el=>el.getClientRects().length)`;
  const fill = text => evaluate(`(()=>{const el=(${dialog}).querySelector('textarea');el.value=${JSON.stringify(text)};el.dispatchEvent(new Event('input',{bubbles:true}))})()`);
  const navigate = async route => { await send('Page.navigate', { url: origin + route }); await waitFor("document.querySelector('.layout-container')"); };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: "localStorage.setItem('admin_token','isolated-browser-token')" });

  await navigate('/admins/wechat-id'); await waitFor("document.querySelectorAll('.el-table__body tr').length===3");
  assert.match(await evaluate('document.body.innerText'), /仅在测试环境可使用/);
  assert.equal(await evaluate("document.querySelectorAll('.test-warning').length"), 1);
  await click('修改'); await waitFor(`Boolean((${dialog})?.querySelector('textarea'))`);
  await fill(' raw direct value '); await click('保存', `(${dialog})`);
  await waitFor(`!(${dialog})`); assert.deepEqual(writes.at(-1), { id: 42, openid: ' raw direct value ', expectedOpenid: 'old-value' });
  await waitFor("document.querySelector('.el-table__body').innerText.includes('raw direct value')");

  await click('修改'); await waitFor(`Boolean((${dialog})?.querySelector('textarea'))`);
  await fill(''); await click('保存', `(${dialog})`); await waitFor(`!(${dialog})`); assert.equal(users[0].openid, null);

  conflict = true; await click('修改'); await waitFor(`Boolean((${dialog})?.querySelector('textarea'))`);
  await fill('keep-draft'); await click('保存', `(${dialog})`); await waitFor(`(${dialog}).innerText.includes('微信ID已被更新')`);
  assert.equal(await evaluate(`(${dialog}).querySelector('textarea').value`), 'keep-draft');
  users[0].openid = 'parallel-update'; conflict = false;
  await click('重新加载当前用户', `(${dialog})`); await waitFor(`(${dialog}).innerText.includes('parallel-update')`);
  assert.equal(await evaluate(`(${dialog}).querySelector('textarea').value`), 'keep-draft');
  await click('保存', `(${dialog})`); await waitFor(`!(${dialog})`); assert.equal(writes.at(-1).expectedOpenid, 'parallel-update');

  await click('修改'); await waitFor(`Boolean((${dialog})?.querySelector('textarea'))`);
  listFails = true; await fill('saved-once'); const beforeRefreshFailure = writes.length;
  await click('保存', `(${dialog})`); await waitFor(`(${dialog}).innerText.includes('已保存，列表刷新失败')`);
  assert.equal(users[0].openid, 'saved-once'); assert.equal(writes.length, beforeRefreshFailure + 1);
  assert.equal(await evaluate("document.querySelectorAll('.el-table__body tr').length"), 0);
  listFails = false; await click('重试刷新', `(${dialog})`); await waitFor(`!(${dialog})`); assert.equal(writes.length, beforeRefreshFailure + 1);

  // 同一用户列表的检索、详情及普通入口保持可用。
  await evaluate("(()=>{const el=document.querySelector('input[placeholder=\"搜索用户手机号或昵称\"]');el.value='13800000044';el.dispatchEvent(new Event('input',{bubbles:true}))})()");
  await click('搜索'); await waitFor("document.querySelectorAll('.el-table__body tr').length===1");
  assert.equal(queries.at(-1).search, '13800000044'); await click('详情'); await waitFor(`(${dialog})?.innerText.includes('44')`); await click('关闭', `(${dialog})`);
  await navigate('/users'); await waitFor("document.querySelectorAll('.el-table__body tr').length===3");
  assert(!await evaluate("[...document.querySelectorAll('.el-table__body button')].some(el=>el.innerText.trim()==='修改')"));
  assert(await evaluate("[...document.querySelectorAll('.el-table__body button')].some(el=>el.innerText.trim()==='冻结')"));

  enabled = false; const prior = writes.length;
  await navigate('/admins/wechat-id'); await waitFor("location.pathname==='/admins'");
  assert(!await evaluate('document.body.innerText.includes("微信ID修改")')); assert.equal(writes.length, prior);
  assert.equal(exceptions.length, 0, exceptions.join('\n'));
  console.log(JSON.stringify({ result: 'passed', scenarios: ['test menu and banner', 'direct raw save', 'clear NULL', '409 preserves draft', 'reload keeps draft', 'saved but refresh failed', 'search and detail', 'ordinary users unchanged', 'production route denied'], mockWrites: writes.length, runtimeExceptions: exceptions.length }));
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  socket?.close(); browser?.kill(); await new Promise(resolve => server.close(resolve)); await pause(500);
  const resolved = path.resolve(profile), prefix = path.resolve(os.tmpdir()) + path.sep;
  if (resolved.startsWith(prefix) && path.basename(resolved).startsWith('m311-browser-')) fs.rmSync(resolved, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
});
