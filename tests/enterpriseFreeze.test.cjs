const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { parse } = require('@vue/compiler-sfc');
const flush = () => new Promise(resolve => setImmediate(resolve));
function harness() {
  const requests = [], confirms = [], successes = [], errors = [];
  const source = parse(fs.readFileSync(path.join(__dirname, '../src/views/Enterprises.vue'), 'utf8')).descriptor.scriptSetup.content;
  const request = {};
  for (const method of ['get', 'post', 'patch']) request[method] = (url, data) => new Promise((resolve, reject) => requests.push({ method, url, data, resolve, reject }));
  const context = { console: { error() {} }, ref: value => ({ value }), reactive: value => value, request,
    onMounted() {}, onBeforeUnmount() {}, watch() {}, nextTick: async () => {},
    useRoute: () => ({ query: {} }), useRouter: () => ({ replace() {} }),
    ElMessage: { success: text => successes.push(text), error: text => errors.push(text) },
    ElMessageBox: { confirm: (...args) => new Promise((resolve, reject) => confirms.push({ args, resolve, reject })) },
    window: { dispatchEvent() {} }, Event: function(type) { this.type = type; } };
  vm.createContext(context);
  vm.runInContext(source.replace(/^import[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '') + '\nglobalThis.api={handleFreeze,handleUnfreeze,statusPending,tableData};', context);
  return { ...context.api, requests, confirms, successes, errors };
}
test('M2.4 确认及请求期间防重复，按服务器状态成功后刷新', async () => {
  const h = harness(), row = { id: 7, status: 'active', companyName: '专项企业' };
  const first = h.handleFreeze(row); await h.handleFreeze(row);
  assert.equal(h.confirms.length, 1); assert.equal(h.statusPending[7], true); assert.equal(h.requests.length, 0);
  h.confirms[0].resolve(); await flush();
  assert.equal(h.requests[0].url, '/admin/enterprises/7/freeze'); assert.equal(h.requests[0].data.action, 'freeze'); assert.equal(row.status, 'active');
  h.requests[0].resolve({ code: 200, data: { status: 'frozen' } }); await flush();
  assert.equal(h.successes[0], '已冻结'); assert.equal(h.requests[1].method, 'get');
  h.requests[1].resolve({ code: 200, data: { list: [{ ...row, status: 'frozen' }], total: 1 } }); await first;
  assert.equal(h.tableData.value[0].status, 'frozen'); assert.equal(h.statusPending[7], undefined);
});
test('M2.4 取消或关闭弹窗不发请求、不显示成功', async () => {
  for (const reason of ['cancel', 'close']) { const h = harness(), pending = h.handleFreeze({ id: 7, status: 'active' }); h.confirms[0].reject(reason); await pending;
    assert.equal(h.requests.length, 0); assert.equal(h.successes.length, 0); assert.equal(h.errors.length, 0); assert.equal(h.statusPending[7], undefined); }
});
test('M2.4 写入失败不先改状态，释放操作锁后可以重试', async () => {
  const h = harness(), row = { id: 7, status: 'active' }, first = h.handleFreeze(row);
  h.confirms[0].resolve(); await flush(); h.requests[0].reject(new Error('日志事务失败')); await first;
  assert.equal(row.status, 'active'); assert.equal(h.successes.length, 0); assert.equal(h.errors[0], '日志事务失败');
  const retry = h.handleFreeze(row); h.confirms[1].reject('cancel'); await retry; assert.equal(h.confirms.length, 2);
});
test('M2.4 响应未确认目标状态不显示成功', async () => {
  const h = harness(), pending = h.handleFreeze({ id: 7, status: 'active' }); h.confirms[0].resolve(); await flush();
  h.requests[0].resolve({ code: 200, data: { status: 'active' } }); await pending;
  assert.equal(h.successes.length, 0); assert.equal(h.errors.length, 1); assert.equal(h.requests.length, 1);
});
test('M2.4 解冻成功但列表刷新失败，提示刷新而非伪造列表状态', async () => {
  const h = harness(), row = { id: 7, status: 'frozen' }, pending = h.handleUnfreeze(row); h.confirms[0].resolve(); await flush();
  assert.equal(h.requests[0].data.action, 'unfreeze'); h.requests[0].resolve({ code: 200, data: { status: 'active' } }); await flush();
  h.requests[1].reject(new Error('network')); await pending;
  assert.equal(h.successes[0], '已解冻'); assert.match(h.errors[0], /列表刷新失败/); assert.equal(row.status, 'frozen'); assert.equal(h.statusPending[7], undefined);
});
