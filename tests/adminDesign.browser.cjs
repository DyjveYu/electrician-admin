// M9.1：仅本机静态构建和模拟 API；无业务服务器、数据库、短信或资金请求。
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const before = process.argv.includes('--before');
const build = path.resolve(__dirname, '../node_modules/.cache/' + (before ? 'm91-before' : 'm91-check'));
const artifacts = path.resolve(__dirname, '../../.tmp/m91-artifacts/' + (before ? 'before' : 'after'));
fs.mkdirSync(artifacts, { recursive: true });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const date = '2026-11-16T02:00:00Z';
const electrician = { id: 42, user_id: 42, real_name: '张师傅', name: '张师傅', phone: '13800000042',
  service_phone: '13800000042', login_phone: '13800000042', work_no: '110101000042', id_card: '110101198001010042',
  status: 'approved', status_text: '已通过认证', user_status: 'active', province: '北京市', city: '北京市', district: '东城区',
  created_at: date, updated_at: date, career_started_month: '2001-03', career_years: 25, hourly_rate: 85, daily_rate: 500,
  profileChangeType: 'information_changed', profileChangeTime: date, profileNoticePending: true, profileNoticeVersion: 2,
  business_revision: 3, region_change_pending_id: 7, pending_region_request: { id: 7, operation: 'add' },
  service_regions: [{ id: 2, province: '北京市', city: '北京市', district: '西城区' }],
  id_card_front: '/fixture.svg',
  licenses: [{ license_type: 'low_voltage', label: '低压电工证', certificate_number: 'T110101198001010042', start_date: '2025-01-01', end_date: '2030-01-01', photo_url: '/fixture.svg' }] };
const user = { id: 42, phone: '13800000042', nickname: '测试用户', real_name: '张师傅', current_role: 'electrician', status: 'active', openid: 'isolated-openid', created_at: date };
const order = { id: 42, order_no: 'ORD202611160000000042', order_type: 'personal_repair', user_phone: user.phone,
  status: 'pending', description: '厨房插座检修与配电箱检查', service_address: '北京市东城区测试街道 42 号',
  total_amount: '123456.78', prepay_amount: '100.00', created_at: date, images: [], electricians: [] };
const partner = { id: 42, name: '朝阳区域合作伙伴', nickname: '运营伙伴', phone: '13800000042', status: 'active', created_at: date,
  areas: [{ province: '北京市', city: '北京市', district: '朝阳区' }], commissionRate: 3, commission_rate: 3 };
const application = { id: 42, name: '测试推荐达人', nickname: '测试推荐达人', phone: user.phone, status: 'pending', created_at: date };
const article = { id: 42, title: '用电安全检查指南', status: 'published', sort_order: 1, read_count: 28, created_at: date, updated_at: date,
  body: [{ type: 'text', text: '这是隔离测试内容，检查文章编辑和预览。' }] };
const region = { id: 7, operation: 'add', status: 'pending', source: 'manual', reason: '增加相邻服务区域',
  province: '北京市', city: '北京市', district: '海淀区', old_province: '北京市', old_city: '北京市', old_district: '东城区',
  submitted_at: date, business_revision: 3, certification: electrician, current_region: ['北京市', '北京市', '东城区'],
  service_regions: electrician.service_regions, materials: { status: 'approved', licenses: electrician.licenses },
  notification: { status: 'sent' } };
const requests = [], exceptions = [], results = [], checks = [];
let mode = 'normal', enabled = true, browser, socket, profile;
function fixture(url, method) {
  const p = url.pathname;
  if (method !== 'GET') {
    if (p.endsWith('/login')) return { token: 'isolated-admin', admin: { id: 1, real_name: '运营管理员' } };
    if (p.includes('profile-notice/read')) return { viewed: true, profileNoticePending: false };
    if (p.endsWith('/images')) return { url: '/fixture.svg' };
    return { ...user, ...region, changed: true };
  }
  if (p.endsWith('/capabilities')) return { wechatIdEditEnabled: enabled, smsTestEnabled: enabled };
  if (p.includes('/auth/')) return { id: 1, username: 'isolated-admin', real_name: '运营管理员' };
  if (p.endsWith('/todo/counts')) return { enterpriseNewCertifications: 2, electricianInfoChanges: 1, regionAdditions: 1 };
  if (p.endsWith('/statistics')) return { users: { total_users: 1286, approved_electricians: 328, pending_electricians: 12 },
    orders: { total: 2048, pending: 6, in_progress: 28, completed: 1980 }, finance: { total_payment_income: 1286400.5,
      electrician_share: 1093440.42, platform_revenue: 154368.06, commission_expense: 38592.02, total_refunds: 4200,
      total_deposits_paid: 32800, total_deposits_refunded: 1200 } };
  if (p.endsWith('/dashboard-chart-data')) return { orderTrend: Array.from({ length: 7 }, (_, i) => ({ date: `11-${10 + i}`, count: [21, 34, 28, 46, 38, 51, 42][i] })),
    orderStatusDistribution: [{ name: '已完成', value: 1980 }, { name: '进行中', value: 28 }, { name: '待接单', value: 6 }] };
  if (p.endsWith('/activities')) return [{ id: 1, time: date, type: '电工认证通过', description: '张师傅完成资料更新', user: '张师傅' }];
  if (p.endsWith('/region-stats')) return { total: 328, uncertifiedCount: 12, totalDepositsPaid: 32800, totalDepositsRefunded: 1200,
    unclassifiedCount: 2, provinces: [{ code: '110000', name: '北京市', count: 150 }, { code: '310000', name: '上海市', count: 176 }] };
  if (/\/partners\/\d+\/stats$/.test(p)) return { partnerInfo: partner, months: ['2026-11'],
    current: mode === 'empty' ? null : { totalElectricians: 28, totalOrders: 168, totalAmount: 23456.78, totalCommission: 703.7, noReferrerOrders: 16, noReferrerAmount: 2000, actualCommission: 643.7 }, electricians: mode === 'empty' ? [] : [electrician] };
  if (p.endsWith('/time-period-fees/config')) return { groups: [{ key: 'legacy', cities: [], label: '通用费率', name: '通用费率', fees: [{ id: 1, period_key: 'day', time_period: '08:00–18:00', name: '日间', period_name: '日间', start_time: '08:00', end_time: '18:00', amount: 50, updated_at: date }] }] };
  if (p.endsWith('/content/ads')) return [];
  if (p.includes('/content/articles/')) return article;
  if (p.includes('/electrician-region-changes/')) return region;
  if (/\/electricians\/\d+$/.test(p)) return electrician;
  if (/\/users\/\d+$/.test(p)) return user;
  if (/\/orders\/\d+$/.test(p)) return order;
  if (p.endsWith('/profile')) return { ...partner, company_name: '测试企业', status: 'approved' };
  if (/\/deposits\/\d+$/.test(p)) return { id: 42, amount: '100.00', status: 'paid', electrician, created_at: date };
  let list = [];
  if (p.endsWith('/electricians')) list = [electrician];
  else if (p.endsWith('/electrician-region-changes')) list = [region];
  else if (p.endsWith('/users')) list = [user];
  else if (p.includes('/orders')) list = [order];
  else if (p.endsWith('/partners')) list = [partner];
  else if (p.endsWith('/referrers') || p.endsWith('/referrer-applications')) list = [application];
  else if (p.endsWith('/enterprises')) list = [{ ...user, company_name: '北京测试企业', certification_status: 'approved', profile_status: 'approved' }];
  else if (p.endsWith('/admins')) list = [{ id: 1, username: 'isolated-admin', real_name: '运营管理员', status: 'active', created_at: date }];
  else if (p.endsWith('/deposits')) list = [{ id: 42, amount: '100.00', status: 'paid', electrician_name: '张师傅', created_at: date }];
  else if (p.includes('/content/articles')) list = [article];
  else if (p.endsWith('/messages')) list = [{ ...article, type: 'system', target_users: 'all', priority: 'normal', content: '测试通知正文' }];
  if (mode === 'empty') list = [];
  return { list, users: list, orders: list, messages: list, total: list.length, provinceOptions: ['北京市'], cityOptions: ['北京市'], districtOptions: ['东城区'], stats: { total: list.length, pending: 1, inProgress: 0, completed: 0 } };
}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    let raw = ''; for await (const part of req) raw += part;
    requests.push({ method: req.method, path: url.pathname, query: Object.fromEntries(url.searchParams), body: raw });
    if (mode === 'slow') await pause(1200);
    const failed = mode === 'fail' && !url.pathname.includes('/auth/') && !url.pathname.endsWith('/capabilities') && !url.pathname.endsWith('/todo/counts');
    res.writeHead(failed ? 500 : 200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({ code: failed ? 500 : 200, message: failed ? '隔离测试：读取失败' : 'ok', data: failed ? null : fixture(url, req.method) }));
  }
  if (url.pathname === '/fixture.svg') { res.setHeader('Content-Type', 'image/svg+xml'); return res.end('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#eff6ff"/><text x="90" y="95" fill="#2563eb">Image preview</text></svg>'); }
  const requested = path.resolve(build, decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html');
  if (!requested.startsWith(build + path.sep)) { res.writeHead(403); return res.end(); }
  const file = fs.existsSync(requested) && fs.statSync(requested).isFile() ? requested : path.join(build, 'index.html');
  res.setHeader('Content-Type', ({ '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' })[path.extname(file)] || 'text/html');
  res.end(fs.readFileSync(file));
});
async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  profile = fs.mkdtempSync(path.join(os.tmpdir(), 'm91-browser-'));
  browser = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'
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
    if (item.method === 'Runtime.exceptionThrown') exceptions.push(item.params.exceptionDetails);
    if (item.method === 'Runtime.consoleAPICalled' && item.params.type === 'error') {
      for (const arg of item.params.args) if (arg.subtype === 'error' && /^(TypeError|ReferenceError|SyntaxError|RangeError)/.test(arg.description || '')) exceptions.push(arg.description);
    }
    if (item.id) { const handler = pending.get(item.id); if (handler) { pending.delete(item.id); item.error ? handler.reject(item.error) : handler.resolve(item.result); } }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails)); return result.result.value;
  };
  const waitFor = async expression => { for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await pause(80); } throw Error('Timed out: ' + expression); };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Page.navigate', { url: origin + '/login' }); await waitFor('!!document.querySelector("input")');
  async function navigate(url, auth = true) {
    await evaluate(auth ? 'localStorage.setItem("admin_token","isolated-admin")' : 'localStorage.removeItem("admin_token")');
    await send('Page.navigate', { url: origin + url });
    await waitFor('!!document.querySelector("#app") && document.querySelector("#app").innerText.length > 12');
    await pause(450);
    if (!before && !url.startsWith('/mobile') && url !== '/login' && url !== '/missing-route') {
      await waitFor('!!document.querySelector(".layout-content h2")');
    }
  }
  const viewport = (width, height, mobile = false) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
  async function capture(name) {
    // 等待浮层／导航过渡结束，避免把过渡中的透明画面当作视觉证据。
    await pause(350);
    if (!before) assert.ok(await evaluate('Array.from(document.querySelectorAll(".el-dialog__footer")).filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== "hidden").every(e => e.getBoundingClientRect().bottom <= innerHeight + 1)'), 'Dialog footer outside viewport: ' + name);
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifacts, name + '.png'), Buffer.from(data, 'base64'));
  }
  const visible = 'e => e.getClientRects().length && getComputedStyle(e).visibility !== "hidden"';
  async function click(selector, label) {
    const found = await evaluate(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(selector)})].filter(${visible}).find(e => e.textContent.trim() === ${JSON.stringify(label)}); if (!e) return false; e.click(); return true })()`);
    assert.ok(found, 'Missing button: ' + label); await pause(180);
  }
  const fill = (selector, value) => evaluate(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); const setter = Object.getOwnPropertyDescriptor(e.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set; setter.call(e, ${JSON.stringify(value)}); e.dispatchEvent(new Event('input', {bubbles:true})); })()`);
  const dialogVisible = 'Array.from(document.querySelectorAll(".el-dialog")).some(e => e.getClientRects().length && getComputedStyle(e).visibility !== "hidden")';
  async function closeDialog() { await evaluate(`Array.from(document.querySelectorAll('.el-dialog__headerbtn')).filter(${visible}).at(-1).click()`); await pause(200); }
  await viewport(1440, 900);
  const routes = ['/dashboard', '/users', '/electricians', '/electricians/region-stats', '/electricians/region-changes', '/enterprises', '/orders', '/orders/non-five-star', '/deposits', '/partners', '/partners/42/stats', '/referrers', '/referrer-applications', '/home-information/electrician-home', '/home-information/safety-knowledge', '/home-information/notices', '/home-information/ads', '/admins', '/admins/wechat-id', '/system/time-period-fees'];
  for (const route of before ? ['/dashboard', '/electricians'] : routes) {
    await navigate(route);
    const info = await evaluate('({text:document.querySelector("#app").innerText.slice(0,200), overflow:document.documentElement.scrollWidth>innerWidth+1})');
    await capture(route.replace(/^\//, '').replaceAll('/', '-'));
    results.push({ page: route, size: '1440x900', ...info });
  }
  if (!before) {
    await navigate('/electricians');
    await fill('.table-toolbar input', '测试姓名'); await click('.table-toolbar button', '搜索'); await pause(250);
    assert.ok(Object.values(requests.findLast(r => r.path === '/api/admin/electricians').query).includes('测试姓名'));
    await click('.table-toolbar button', '重置');
    await click('.el-table button', '详情'); await waitFor(dialogVisible); await waitFor('document.querySelector(".el-dialog__body").innerText.includes("低压电工证")');
    assert.ok(await evaluate('document.querySelector(".el-dialog__body").innerText.includes("新增区域待审核")'));
    await capture('electrician-detail-dialog');
    assert.ok(requests.some(r => r.path.endsWith('/42/profile-notice/read') && JSON.parse(r.body).version === 2));
    await click('.el-dialog__footer button', '审核新增区域'); await pause(300); await capture('region-review-desktop');
    await viewport(390, 844, true); await pause(250); await capture('region-review-narrow');
    assert.ok(await evaluate('Array.from(document.querySelectorAll(".el-dialog")).filter(e=>e.getClientRects().length).every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1})'));
    checks.push('筛选、重置、资料版本确认、多状态详情及区域审核窄屏浮层');

    await viewport(1440, 900); await navigate('/home-information/electrician-home');
    await click('button', '新增文章'); await waitFor(dialogVisible);
    await fill('.el-dialog input', 'M9.1 隔离预览'); await click('.el-dialog button', '添加段落');
    await fill('.el-dialog textarea', '文章段落保持可编辑，长文本和图片在弹窗内预览。');
    const imageFile = path.join(artifacts, 'fixture.png');
    fs.writeFileSync(imageFile, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64'));
    const { root } = await send('DOM.getDocument');
    const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector: '.el-dialog input[type=file]' });
    await send('DOM.setFileInputFiles', { nodeId, files: [imageFile] });
    await waitFor('!!document.querySelector(".el-dialog .block img")');
    await click('.el-dialog button', '预览（不计阅读量）'); await pause(250); await capture('article-preview');
    assert.ok(await evaluate('Array.from(document.querySelectorAll(".el-dialog")).some(e=>e.innerText.includes("文章段落保持可编辑"))'));
    checks.push('文章新增、段落编辑、模拟图片上传和预览浮层（未保存真实内容）');
    for (const [url, label] of [['/admins','新增管理员'],['/partners','新增合作伙伴'],['/home-information/notices','发布通知'],['/orders','详情'],['/deposits','详情']]) {
      await navigate(url); await click('.layout-content button', label); await waitFor(dialogVisible); await capture(url.replaceAll('/','-') + '-dialog');
      const writes = requests.filter(r=>r.method!=='GET').length;
      await closeDialog(); assert.equal(requests.filter(r=>r.method!=='GET').length, writes, 'Closing must not submit');
    }
    checks.push('管理员、合作伙伴、通知、订单、押金弹窗及取消不提交');

    await navigate('/dashboard'); await waitFor('document.querySelectorAll(".chart-container canvas").length === 2');
    await evaluate('document.querySelector(".collapse-btn").click()'); await pause(350);
    assert.ok(await evaluate('Array.from(document.querySelectorAll(".chart-container")).every(e=>Math.abs(e.clientWidth-e.querySelector("canvas").getBoundingClientRect().width)<2)'));
    await evaluate('document.querySelector(".layout-content").scrollTop = document.querySelector(".chart-section").offsetTop - 90');
    await capture('dashboard-charts');
    await evaluate('document.querySelector(".layout-content").scrollTop = 0');
    checks.push('侧栏收合后图表随容器适配');
    mode = 'fail'; await click('.page-heading button','刷新数据'); await pause(400);
    assert.ok(await evaluate('document.querySelectorAll(".load-feedback").length === 3'));
    assert.ok(await evaluate('document.querySelector(".metric-value").innerText === "1286"'));
    await capture('dashboard-refresh-error'); mode = 'normal';
    await click('.load-feedback button','重新加载'); await pause(300);
    checks.push('仪表盘三个模块独立失败、旧数据标识和查询重试');
    mode = 'fail'; await navigate('/dashboard');
    assert.equal(await evaluate('document.querySelectorAll(".metric-value").length'),0);
    mode = 'normal'; await click('.load-feedback button','重新加载'); await waitFor('document.querySelectorAll(".metric-value").length === 11');
    checks.push('首次统计失败无虚假零值，重试恢复真实指标');
    mode = 'empty'; await navigate('/partners/42/stats'); await waitFor('document.querySelector(".layout-content").innerText.includes("暂无统计数据")'); await capture('partner-stats-empty');
    mode = 'normal'; checks.push('合作伙伴空统计对象无崩溃');

    enabled = false; await navigate('/admins/wechat-id'); await waitFor('location.pathname === "/admins"');
    assert.equal(await evaluate('document.querySelector("#app").innerText.includes("新的微信ID")'), false);
    enabled = true; checks.push('服务端测试能力关闭时拒绝测试路由');
  }
  await navigate('/login', false); await capture('login');
  if (!before) { await navigate('/missing-route'); await capture('404'); }
  await viewport(390, 844, true);
  await navigate('/mobile.html#/'); await capture('mobile-list');
  await navigate('/mobile.html#/electrician-detail?id=42'); await capture('mobile-detail');
  if (!before) {
    await click('.bottom-actions button','审核新增区域'); await waitFor(dialogVisible); await capture('mobile-region-review'); await closeDialog();
    await evaluate('document.querySelector(".photo-item").click()'); await pause(250); await capture('mobile-image-preview');
    checks.push('手机区域审核及图片预览');
    mode = 'fail'; await navigate('/mobile.html#/');
    await waitFor('!!document.querySelector(".load-feedback")'); mode = 'normal';
    await click('.load-feedback button','重新加载'); await waitFor('!!document.querySelector(".card")');
    checks.push('手机列表失败可重试，不跳过页码');
  }
  await navigate('/mobile.html#/login', false); await capture('mobile-login');
  if (!before) {
    for (const [width, height] of [[1920,1080],[1280,800],[1024,768],[768,1024]]) {
      await viewport(width, height);
      for (const route of routes) {
        await navigate(route);
        await capture(route.replace(/^\//, '').replaceAll('/', '-') + '-' + width);
        results.push({ page: route, size: `${width}x${height}`, overflow: await evaluate('document.documentElement.scrollWidth>innerWidth+1') });
      }
      console.log('Responsive desktop sweep passed: ' + width);
    }
    for (const [width, height] of [[375,812],[430,932],[360,800],[844,390]]) {
      await viewport(width, height, true);
      for (const [url, name, auth] of [['/mobile.html#/', 'mobile-list', true], ['/mobile.html#/electrician-detail?id=42','mobile-detail',true], ['/mobile.html#/login','mobile-login',false]]) {
        await navigate(url, auth); await capture(name + '-' + width);
        results.push({ page: name, size: `${width}x${height}`, overflow: await evaluate('document.documentElement.scrollWidth>innerWidth+1') });
      }
    }
  }
  fs.writeFileSync(path.join(artifacts, 'report.json'), JSON.stringify({ results, checks, exceptions, requests }, null, 2));
  console.log(JSON.stringify({ before, artifacts, pages: results.length, checks, exceptions: exceptions.length, overflows: results.filter(x => x.overflow).map(x => x.page + ':' + x.size) }));
  if (!before) { assert.equal(exceptions.length, 0, JSON.stringify(exceptions)); assert.equal(results.filter(x => x.overflow).length, 0, 'Unexpected page overflow'); }
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { if (socket) socket.close(); if (browser) browser.kill(); server.close(); });
