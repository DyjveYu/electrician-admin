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
  vm.runInContext(source.replace(/^import[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '') + '\nglobalThis.api={handleBlacklist,blacklistPending,tableData};', context);
  return { ...context.api, requests, confirms, successes, errors };
}

test('M2.6 加入黑名单确认及请求期间防重复，按服务器实际标记刷新', async () => {
  const h=harness(),row={id:7,status:'active',enterpriseBlacklisted:false},pending=h.handleBlacklist(row);await h.handleBlacklist(row);assert.equal(h.confirms.length,1);
  h.confirms[0].resolve();await flush();assert.equal(h.requests[0].url,'/admin/enterprises/7/blacklist');assert.equal(h.requests[0].data.blacklisted,true);assert.equal(row.enterpriseBlacklisted,false);
  h.requests[0].resolve({code:200,data:{enterpriseBlacklisted:true,status:'active'}});await flush();
  h.requests[1].resolve({code:200,data:{list:[{...row,enterpriseBlacklisted:true}],total:1}});await pending;
  assert.equal(h.tableData.value[0].enterpriseBlacklisted,true);assert.equal(h.tableData.value[0].status,'active');assert.equal(h.blacklistPending[7],undefined);
});
test('M2.6 移出黑名单不向接口发送解冻，仍显示原冻结状态', async () => {
  const h=harness(),row={id:7,status:'frozen',enterpriseBlacklisted:true},pending=h.handleBlacklist(row);h.confirms[0].resolve();await flush();assert.equal(h.requests[0].data.blacklisted,false);
  h.requests[0].resolve({code:200,data:{enterpriseBlacklisted:false,status:'frozen'}});await flush();h.requests[1].resolve({code:200,data:{list:[{...row,enterpriseBlacklisted:false}],total:1}});await pending;
  assert.equal(h.tableData.value[0].status,'frozen');assert.equal(h.successes[0],'已移出黑名单');
});
test('M2.6 取消、失败或未确认的响应不伪造成功', async () => {
  for(const outcome of ['cancel','failure','unconfirmed']){
    const h=harness(),row={id:7,enterpriseBlacklisted:false},pending=h.handleBlacklist(row);
    if(outcome==='cancel')h.confirms[0].reject('cancel');else{h.confirms[0].resolve();await flush();if(outcome==='failure')h.requests[0].reject(new Error('审计失败'));else h.requests[0].resolve({code:200,data:{enterpriseBlacklisted:false}});}
    await pending;assert.equal(h.successes.length,0);assert.equal(row.enterpriseBlacklisted,false);assert.equal(h.blacklistPending[7],undefined);
  }
});
test('M2.6 保存成功但列表刷新失败单独提示，不反向修改旧快照', async () => {
  const h=harness(),row={id:7,enterpriseBlacklisted:false},pending=h.handleBlacklist(row);h.confirms[0].resolve();await flush();h.requests[0].resolve({code:200,data:{enterpriseBlacklisted:true}});await flush();h.requests[1].reject(new Error('offline'));await pending;
  assert.equal(h.successes.length,1);assert.match(h.errors[0],/列表刷新失败/);assert.equal(row.enterpriseBlacklisted,false);
});
