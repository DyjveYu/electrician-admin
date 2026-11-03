const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { parse } = require('@vue/compiler-sfc');
const flush = () => new Promise(resolve => setImmediate(resolve));
function harness(file, exports) {
  const source = parse(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8')).descriptor.scriptSetup.content;
  const requests = [], mounted = [], unmounted = [], watchers = [], events = [], routes = [], listeners = new Map(), timers = [];
  const request = { defaults: { baseURL: 'http://localhost:3000/api' } };
  for (const method of ['get', 'post', 'patch']) request[method] = (url, data) => new Promise((resolve, reject) => requests.push({ method, url, data, resolve, reject }));
  const route = { query: {}, meta: {}, path: '/enterprises' };
  const context = { console: { error() {}, log() {} }, ref: value => ({ value }), reactive: value => value,
    computed: fn => ({ get value() { return fn(); } }), nextTick: () => Promise.resolve(),
    onMounted: fn => mounted.push(fn), onUnmounted: fn => unmounted.push(fn), onBeforeUnmount: fn => unmounted.push(fn), watch: (source, fn) => watchers.push(fn),
    useRoute: () => route, useRouter: () => ({ push: value => routes.push(value), replace: value => routes.push(value) }),
    useAuthStore: () => ({ adminInfo: { real_name: '测试' }, logout() {} }),
    ElMessage: { success() {}, error() {} }, ElMessageBox: {}, request,
    getTodoCounts: () => request.get('/admin/todo/counts'),
    window: { addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name), dispatchEvent: event => { events.push(event.type); listeners.get(event.type)?.(); } },
    Event: function(type) { this.type = type; }, setInterval: (fn, ms) => { timers.push({ fn, ms }); return timers.length; }, clearInterval() {} };
  vm.createContext(context);
  const code = source.replace(/^import[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '');
  vm.runInContext(code + '\nglobalThis.api = {' + exports + '};', context);
  return { ...context.api, requests, route, mounted, unmounted, watchers, events, routes, timers, listeners };
}
function page() { return harness('views/Enterprises.vue', 'viewProfile, loadProfile, confirmProfileView, profileData, profileDialogVisible, profileReadError, profileLoading, fetchList, tableData, pagination'); }
function profile(version = 2) { return { code: 200, data: { id: 7, certification: { companyName: '测试', profileNoticePending: true, profileNoticeVersion: version, profileChangeType: 'information_changed' } } }; }
test('M2.3 详情成功展示后才确认本次版本，成功后刷新列表和铃铛', async () => {
  const h = page(); h.viewProfile({ id: 7 }); assert.equal(h.requests.length, 1);
  assert.equal(h.profileData.value, null); h.requests[0].resolve(profile()); await flush();
  const post = h.requests.find(r => r.method === 'post'); assert.ok(post); assert.equal(post.data.version, 2);
  assert.equal(h.profileData.value.certification.companyName, '测试');
  post.resolve({ code: 200, data: { profileNoticeVersion: 3, profileNoticePending: true } }); await flush();
  assert.ok(h.events.includes('enterprise-profile-viewed')); assert.equal(h.profileData.value.certification.profileChangeType, 'information_changed');
  assert.ok(h.requests.some(r => r.url === '/admin/enterprises'));
});
test('M2.3 详情加载失败或展示前关闭，不消除提醒', async () => {
  const h = page(); h.viewProfile({ id: 7 }); h.requests[0].reject(new Error('network')); await flush();
  assert.equal(h.requests.filter(r => r.method === 'post').length, 0);
  h.viewProfile({ id: 7 }); h.profileDialogVisible.value = false; h.requests[1].resolve(profile()); await flush();
  assert.equal(h.requests.filter(r => r.method === 'post').length, 0);
});
test('M2.3 已查看失败保留重试，仍使用原展示版本', async () => {
  const h = page(); h.viewProfile({ id: 7 }); h.requests[0].resolve(profile(4)); await flush();
  h.requests[1].reject(new Error('write fail')); await flush(); assert.equal(h.profileReadError.value, true);
  const retry = h.confirmProfileView(); const posts = h.requests.filter(r => r.method === 'post'); assert.equal(posts.length, 2); assert.equal(posts[1].data.version, 4);
  posts[1].resolve({ code: 200 }); await retry; assert.equal(h.profileReadError.value, false);
});
test('M2.3 切换企业时，旧详情响应不能标记新企业', async () => {
  const h = page(); h.viewProfile({ id: 7 }); h.viewProfile({ id: 8 });
  h.requests[0].resolve(profile(1)); await flush(); assert.equal(h.requests.filter(r => r.method === 'post').length, 0);
  h.requests[1].resolve(profile(5)); await flush(); assert.equal(h.requests.at(-1).url, '/admin/enterprises/8/profile-notice/read');
});
test('M2.3 铃铛两项计入总数并跳到各自筛选，30秒刷新且卸载清理', async () => {
  const h = harness('layout/index.vue', 'todoCounts, loadTodoCounts, handleTodoCommand');
  h.mounted.forEach(fn => fn()); assert.equal(h.timers[0].ms, 30000);
  h.requests[0].resolve({ code: 200, data: { depositRefunds: 1, certifications: 2, unfreezeApplications: 3, enterpriseNewCertifications: 4, enterpriseInfoChanges: 5 } }); await flush();
  assert.equal(h.todoCounts.total, 15);
  h.handleTodoCommand('enterpriseNew'); h.handleTodoCommand('enterpriseChange');
  assert.equal(h.routes[0], '/enterprises?profileNotice=new_certification'); assert.equal(h.routes[1], '/enterprises?profileNotice=information_changed');
  assert.ok(h.listeners.has('enterprise-profile-viewed')); h.unmounted.forEach(fn => fn()); assert.equal(h.listeners.size, 0);
});
test('M2.3 角标刷新忽略旧响应，列表筛选传到接口', async () => {
  const h = harness('layout/index.vue', 'todoCounts, loadTodoCounts'); const old = h.loadTodoCounts(), latest = h.loadTodoCounts();
  h.requests[1].resolve({ code: 200, data: { enterpriseInfoChanges: 1 } }); await latest;
  h.requests[0].resolve({ code: 200, data: { enterpriseInfoChanges: 9 } }); await old; assert.equal(h.todoCounts.total, 1);
  const p = page(); p.route.query.profileNotice = 'information_changed'; const req = p.fetchList();
  assert.equal(p.requests[0].data.params.profileNotice, 'information_changed'); p.requests[0].resolve({ code: 200, data: { list: [], total: 0 } }); await req;
});
