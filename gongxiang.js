// ══════════════════════════════════════════
// 餐小算 V2 · 共享模块
// 用户体系 / 权限 / 底部导航 / 日志 / 通知
// 版本号：上线后据此判断线上跑的是哪版（每次更新改这里 + 记 CHANGELOG.md）
window.APP_VERSION = '1.0.0';
// ══════════════════════════════════════════

// ── 全局样式 ──
(function(){
  var s=document.createElement('style');
  s.textContent='body{font-weight:600}.role-tag{display:none!important}';
  document.head.appendChild(s);
})();

// Polyfill（兼容旧手机浏览器）
if(!Array.prototype.find){Array.prototype.find=function(fn){for(var i=0;i<this.length;i++){if(fn(this[i],i,this))return this[i];}return undefined;};}
if(!String.prototype.padStart){String.prototype.padStart=function(len,str){str=str||' ';var s=String(this);while(s.length<len){s=str+s;}return s.slice(0,len);};}

// ── 工具函数 ──
function loadJSON(k){ try{ var d=localStorage.getItem(k); return d?JSON.parse(d):[]; }catch(e){ return[]; } }
function loadObj(k){ try{ var d=localStorage.getItem(k); return d?JSON.parse(d):{}; }catch(e){ return{}; } }
function saveJSON(k,v){ localStorage.setItem(k,JSON.stringify(v)); }
function saveObj(k,v){ localStorage.setItem(k,JSON.stringify(v)); }
function pad(n){ return n<10?'0'+n:String(n); }
function todayStr(){ var d=new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function nowTimeStr(){ var d=new Date(); return pad(d.getHours())+':'+pad(d.getMinutes()); }
function fmt2(n){ return Number(n||0).toFixed(2); }
function fmt0(n){ return Math.round(Number(n||0)); }

// ── Toast ──
function toast(msg, ok){
  var t=document.getElementById('toast'); if(!t) return;
  t.textContent=(ok===false?'❌ ':ok===true?'✅ ':'')+msg;
  t.classList.add('show');
  setTimeout(function(){ t.classList.remove('show'); }, 2000);
}

// ═══════════ 用户体系 ═══════════
function getUsers(){ return loadJSON('sxs_users'); }
function saveUsers(v){ saveJSON('sxs_users',v); }

function getCurrentUserId(){
  var id=localStorage.getItem('sxs_current_user');
  if(!id){
    // 首次启动，自动创建老板账号
    var users = getUsers();
    if(!users.length){
      var boss = { id:'u_boss_001', name:'老板', role:'boss', active:true, createdAt:todayStr() };
      saveUsers([boss]);
      id=boss.id;
    } else {
      // 找第一个boss
      var b = users.find(function(u){return u.role==='boss';});
      id = b ? b.id : users[0].id;
    }
    localStorage.setItem('sxs_current_user', id);
  }
  return id;
}

function setCurrentUser(id){ localStorage.setItem('sxs_current_user', id); }

function getCurrentUser(){
  var id = getCurrentUserId();
  var users = getUsers();
  return users.find(function(u){return u.id===id;}) || null;
}

function getUserName(){
  var u = getCurrentUser();
  return u ? u.name : '用户';
}

// ── 角色名称映射 ──
function getRoleName(role){
  var map = { boss:'👔 老板', chef:'👨‍🍳 厨师长', manager:'🏪 店长', buyer:'🛒 采购员', keeper:'📦 仓管', waiter:'🍽️ 点菜员' };
  if(map[role]) return map[role];
  if(role && role.indexOf('cr::')===0){
    var nm = role.slice(4);
    var crs = (typeof getCustomRoles==='function') ? getCustomRoles() : [];
    var cr = null;
    for(var i=0;i<crs.length;i++){ if(crs[i].name===nm){ cr=crs[i]; break; } }
    if(cr) return '👤 '+cr.name;
  }
  return '👤 员工';
}
// ── 自定义角色（老板可在团队成员里新增，命名+独立权限）──
function getCustomRoles(){
  try{ return JSON.parse(localStorage.getItem('sxs_custom_roles')||'[]'); }catch(e){ return []; }
}
function saveCustomRoles(a){ try{ localStorage.setItem('sxs_custom_roles', JSON.stringify(a)); }catch(e){} }

// ── 权限 ──
// 默认权限配置（每个角色创建时自动填充）
function getDefaultPerms(role){
  var base = {
    baobiao: true, caidan: true, dingdan: true, caigou: true,
    kucun: true, jizhang: true, shezhi: true, shuju: false
  };
  // 采购二级权限
  base.caigou_edit_prod = false;
  base.caigou_edit_qty = false;
  base.caigou_add_prod = false;
  // 库存二级权限
  base.kucun_edit_qty = false;
  // 记账二级权限
  base.jizhang_edit = false;

  if(role==='boss'){
    base.caigou_edit_prod = true;
    base.caigou_edit_qty = true;
    base.caigou_add_prod = true;
    base.kucun_edit_qty = true;
    base.jizhang_edit = true;
    base.shuju = true;   // 老板默认可做数据管理（导出/导入/清空）
  }
  if(role==='keeper'){
    base.kucun_edit_qty = true; // 仓管默认可改库存数量
  }
  return base;
}

function getUserPerms(){
  var u = getCurrentUser();
  if(!u) return {};
  // 老板全开
  if(u.role==='boss'){
    var p = getDefaultPerms('boss');
    p.caigou = true; p.kucun = true; p.jizhang = true;
    p.chef_review = true; p.boss_review = true;
    return p;
  }
  // 其他角色读存储的权限
  var perms = u.perms || {};
  // 确保所有key存在
  var def = getDefaultPerms(u.role);
  for(var k in def){ if(perms[k]===undefined) perms[k]=def[k]; }
  return perms;
}

// ── 获取跳转URL（带上当前用户） ──
function userUrl(path){
  var sep = path.indexOf('?')>=0 ? '&' : '?';
  return path + sep + 'uid=' + encodeURIComponent(getCurrentUserId());
}

// ═══════════ 密码（base64 简单遮挡，非真加密）═══════════
function pwdEncode(p){ try{ return btoa(unescape(encodeURIComponent(p||''))); }catch(e){ return ''; } }
function pwdDecode(s){ try{ return decodeURIComponent(escape(atob(s||''))); }catch(e){ return ''; } }
function hasPwd(userId){
  var u = getUsers().find(function(x){return x.id===userId;});
  return !!(u && u.password);
}
function checkPwd(userId, input){
  var u = getUsers().find(function(x){return x.id===userId;});
  if(!u || !u.password) return false;   // 无密码=未设置，不让进（全部角色必须设密码）
  return pwdDecode(u.password) === (input||'');
}
function setPwd(userId, plain){
  var users=getUsers(), u=users.find(function(x){return x.id===userId;});
  if(!u) return false;
  u.password = pwdEncode(plain); saveUsers(users); return true;
}

// ═══════════ 采购流程开关 ═══════════
// sxs_purchase_flow: { chefReview:true, bossReview:false }
// chefReview: 是否需要厨师长审核（关→仓管直接发到采购）
// bossReview: 是否需要老板审批（关→厨师长通过后直接到采购）
function getPurchaseFlow(){
  return loadJSON('sxs_purchase_flow');
}
function savePurchaseFlow(flow){
  saveJSON('sxs_purchase_flow', flow);
}

// 根据流程开关计算采购单下一状态
// fromRole: 'keeper'|'chef'|'boss'
function getNextStatus(fromRole){
  var flow = getPurchaseFlow();
  if(fromRole==='buyer'){
    return 'pending_receive';   // 采购员提交即待仓管验收，不经厨师长/老板审核
  }
  if(fromRole==='keeper'){
    if(flow.chefReview) return 'chef_pending';   // → 待厨师长审核
    if(flow.bossReview) return 'boss_pending';     // → 待老板审批
    return 'approved';                              // → 直接到采购
  }
  if(fromRole==='chef'){
    if(flow.bossReview) return 'boss_pending';      // → 待老板审批
    return 'approved';                              // → 直接到采购
  }
  if(fromRole==='boss'){
    return 'approved';                              // → 到采购
  }
  return 'approved';
}

// ═══════════ 底部导航（统一） ═══════════
function renderBottomNav(activeKey){
  var perms = getUserPerms();
  var tabs = [];

  // 所有角色都显示这6个（根据权限开关）
  if(perms.baobiao) tabs.push({ key:'baobiao', icon:'📊', label:'报表', href:'catering.html' });
  if(perms.caidan) tabs.push({ key:'caidan', icon:'🍽️', label:'点菜', href:'menu_new.html' });
  if(perms.caigou) tabs.push({ key:'caigou', icon:'🛒', label:'采购', href:'caigou.html' });
  if(perms.kucun) tabs.push({ key:'kucun', icon:'📦', label:'库存', href:'kucun.html' });
  if(perms.jizhang) tabs.push({ key:'jizhang', icon:'📒', label:'记账', href:'jizhang.html' });
  // 厨房长工作台入口（老板可查看/审核，厨师长日常使用）
  try{
    var _cu = getCurrentUser();
    if(_cu && (perms.chef || _cu.role==='chef' || _cu.role==='boss')){
      tabs.push({ key:'chefdesk', icon:'👨‍🍳', label:'厨房长', href:'chef.html' });
    }
  }catch(e){}
  tabs.push({ key:'shezhi', icon:'👤', label:'我的', href:'shezhi.html' });

  // 去重（按key）
  var seen={}, filtered=[];
  tabs.forEach(function(t){
    if(!seen[t.key]){ seen[t.key]=true; filtered.push(t); }
  });

  var h='';
  filtered.forEach(function(t){
    var act = t.key===activeKey ? ' active' : '';
    h += '<a class="nav-item'+act+'" href="'+userUrl(t.href)+'"><span class="n-icon">'+t.icon+'</span><span class="n-label">'+t.label+'</span></a>';
  });
  var nav = document.getElementById('bottomNav');
  if(nav) nav.innerHTML = h;
}

// ═══════════ 商品库初始化（首次为空时预置示例） ═══════════
// 仅当 sp_prods 从未初始化（localStorage 无该 key）时才写入，避免覆盖用户有意清空的数据
function seedDefaultProducts(){
  try{
    if(localStorage.getItem('sp_prods')!==null) return; // 已初始化过（含空数组）不覆盖
    var cats=[
      {id:'cat_rou',name:'肉类',level:1,parentId:null},
      {id:'cat_shu',name:'蔬菜',level:1,parentId:null},
      {id:'cat_dan',name:'蛋奶',level:1,parentId:null},
      {id:'cat_tiao',name:'调料',level:1,parentId:null},
      {id:'cat_zhu',name:'主食',level:1,parentId:null}
    ];
    var prods=[
      {id:'sp_1',name:'五花肉',unit:'斤',lastPrice:16,catId:'cat_rou',qty:10,alertQty:5,emoji:'🥩'},
      {id:'sp_2',name:'瘦肉',unit:'斤',lastPrice:18,catId:'cat_rou',qty:8,alertQty:4,emoji:'🥩'},
      {id:'sp_3',name:'鸡腿',unit:'斤',lastPrice:12,catId:'cat_rou',qty:6,alertQty:3,emoji:'🍗'},
      {id:'sp_4',name:'大白菜',unit:'斤',lastPrice:1.5,catId:'cat_shu',qty:20,alertQty:8,emoji:'🥬'},
      {id:'sp_5',name:'青菜',unit:'斤',lastPrice:2.5,catId:'cat_shu',qty:15,alertQty:6,emoji:'🥬'},
      {id:'sp_6',name:'土豆',unit:'斤',lastPrice:2,catId:'cat_shu',qty:18,alertQty:8,emoji:'🥔'},
      {id:'sp_7',name:'鸡蛋',unit:'板',lastPrice:25,catId:'cat_dan',qty:5,alertQty:2,emoji:'🥚'},
      {id:'sp_8',name:'牛奶',unit:'瓶',lastPrice:6,catId:'cat_dan',qty:12,alertQty:5,emoji:'🥛'},
      {id:'sp_9',name:'食盐',unit:'包',lastPrice:2,catId:'cat_tiao',qty:30,alertQty:10,emoji:'🧂'},
      {id:'sp_10',name:'生抽',unit:'瓶',lastPrice:8,catId:'cat_tiao',qty:10,alertQty:4,emoji:'🍶'},
      {id:'sp_11',name:'食用油',unit:'桶',lastPrice:65,catId:'cat_tiao',qty:4,alertQty:2,emoji:'🛢️'},
      {id:'sp_12',name:'大米',unit:'袋',lastPrice:55,catId:'cat_zhu',qty:6,alertQty:3,emoji:'🍚'},
      {id:'sp_13',name:'面条',unit:'包',lastPrice:4,catId:'cat_zhu',qty:20,alertQty:8,emoji:'🍜'}
    ];
    localStorage.setItem('sp_cats', JSON.stringify(cats));
    localStorage.setItem('sp_prods', JSON.stringify(prods));
  }catch(e){}
}
// [SEED-AUTO] 页面加载即补示例商品：清缓存后打开任意页面，商品库自动有示例数据，避免选品为空无法采购
try{ if(typeof seedDefaultProducts==='function') seedDefaultProducts(); }catch(e){}

// ═══════════ 操作日志 ═══════════
function addLog(action, detail, target){
  var logs = loadJSON('sxs_logs');
  var u = getCurrentUser();
  logs.push({
    time: todayStr()+' '+nowTimeStr(),
    userId: u?u.id:'',
    userName: u?u.name:'',
    action: action,
    detail: detail,
    target: target||''
  });
  // 保留最近500条
  if(logs.length>500) logs = logs.slice(-500);
  saveJSON('sxs_logs', logs);
}

// ═══════════ 消息通知 ═══════════
// 消息通知已停用（2026-07-11）：改为业务入口红点提醒（采购页"订单记录" / 库存页"入库管理"）。
// 保留函数签名，避免散落各页的调用报错，但不再写入任何消息。
function addNotification(type, title, msg, link, targetUserIds){ /* disabled 2026-07-11 */ }

function getMyNotifications(){
  var all = loadJSON('sxs_notifications');
  var uid = getCurrentUserId();
  return all.filter(function(n){
    return !n.targetUserIds.length || n.targetUserIds.indexOf(uid)>=0;
  }).sort(function(a,b){ return b.id.localeCompare(a.id); });
}

function getUnreadCount(){
  return getMyNotifications().filter(function(n){return !n.read;}).length;
}

function markNotificationRead(id){
  var all = loadJSON('sxs_notifications');
  var n = all.find(function(x){return x.id===id;});
  if(n) n.read = true;
  saveJSON('sxs_notifications', all);
}

function clearAllNotifications(){
  var all = loadJSON('sxs_notifications');
  all.forEach(function(n){n.read=true;});
  saveJSON('sxs_notifications', all);
  updateNotifBell();
}

// ═══════════ 审核待办铃铛（全站右上角，按角色算待办） ═══════════
function getPendingReviewCount(){
  var user=getCurrentUser(); if(!user) return 0;
  var orders=loadJSON('sxs_purchase_orders')||[];
  if(user.role==='chef')   return orders.filter(function(o){return o.status==='chef_pending';}).length;
  if(user.role==='boss')   return orders.filter(function(o){return o.status==='chef_pending'||o.status==='boss_pending';}).length;
  if(user.role==='keeper') return orders.filter(function(o){return o.status==='pending_receive';}).length;
  if(user.role==='buyer')  return orders.filter(function(o){return o.status==='pending_buy'||o.status==='approved';}).length;
  return 0;
}
function ensureNotifBell(){
  // 消息中心开关：关闭后不显示铃铛
  var enabled = localStorage.getItem('sxs_notif_enabled');
  if(enabled==='0'){ var ex=document.getElementById('sxsBell'); if(ex) ex.remove(); return; }
  if(document.getElementById('sxsBell')) return;
  var b=document.createElement('div'); b.id='sxsBell';
  b.style.cssText='position:fixed;top:10px;right:56px;z-index:120;width:36px;height:36px;border-radius:50%;background:#fff;box-shadow:0 2px 10px rgba(0,0,0,.18);display:flex;align-items:center;justify-content:center;font-size:18px;cursor:pointer;';
  b.innerHTML='🔔<span id="sxsBellCount" style="position:absolute;top:-5px;right:-5px;min-width:18px;height:18px;line-height:18px;text-align:center;background:#e23b3b;color:#fff;border-radius:9px;font-size:11px;display:none;">0</span>';
  b.setAttribute('onclick','sxsBellClick()');
  document.body.appendChild(b);
  try{ attachBellDrag(b); }catch(e){}
}
function sxsBellClick(){
  if(_bellMoved){ _bellMoved=false; return; } // 拖动结束不触发点击
  openNotifCenter();
}
function updateNotifBell(){
  var enabled = localStorage.getItem('sxs_notif_enabled');
  if(enabled==='0'){ var ex=document.getElementById('sxsBell'); if(ex) ex.style.display='none'; return; }
  try{ ensureNotifBell(); }catch(e){ return; }
  var c=getPendingReviewCount();
  var el=document.getElementById('sxsBellCount');
  if(el){ if(c>0){ el.textContent=c; el.style.display='block'; } else { el.style.display='none'; } }
  var bell=document.getElementById('sxsBell'); if(bell) bell.title = c>0?('您有 '+c+' 项待办'):'暂无待办';
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', updateNotifBell); else updateNotifBell();

// ═══════════ 消息中心：铃铛拖拽 + 通用订单详情（全站通用） ═══════════
var _bellDrag=null, _bellMoved=false;

function attachBellDrag(bell){
  if(!bell || bell._dragBound){ return; }
  bell._dragBound=true;
  function down(e){
    var p = e.touches ? e.touches[0] : e;
    var r = bell.getBoundingClientRect();
    _bellDrag = { sx:p.clientX, sy:p.clientY, ox:r.left, oy:r.top };
    _bellMoved = false;
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
    document.addEventListener('touchmove', move, {passive:false});
    document.addEventListener('touchend', up);
  }
  function move(e){
    if(!_bellDrag) return;
    var p = e.touches ? e.touches[0] : e;
    var dx = p.clientX - _bellDrag.sx, dy = p.clientY - _bellDrag.sy;
    if(Math.abs(dx) > 4 || Math.abs(dy) > 4) _bellMoved = true;
    if(_bellMoved){
      if(e.cancelable) e.preventDefault();
      bell.style.right = 'auto';
      bell.style.left = (_bellDrag.ox + dx) + 'px';
      bell.style.top = (_bellDrag.oy + dy) + 'px';
    }
  }
  function up(){
    _bellDrag = null;
    document.removeEventListener('mousemove', move);
    document.removeEventListener('mouseup', up);
    document.removeEventListener('touchmove', move);
    document.removeEventListener('touchend', up);
  }
  bell.addEventListener('mousedown', down);
  bell.addEventListener('touchstart', down, {passive:true});
}

function injectNotifCenter(){
  if(document.getElementById('sxsNotifStyle')) return;
  var st = document.createElement('style'); st.id='sxsNotifStyle';
  st.textContent = '#sxsNotifMask{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:200;display:none;align-items:center;justify-content:center;}'
    + '#sxsNotifPanel{width:92%;max-width:420px;max-height:86vh;margin:0;background:#fff;border-radius:16px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.25);}'
    + '.sxs-nc-title{padding:14px 16px;font-weight:700;font-size:17px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;}'
    + '.sxs-nc-close{cursor:pointer;font-size:22px;color:#999;line-height:1;}'
    + '.sxs-nc-body{flex:1;overflow:auto;padding:10px 12px;}'
    + '.sxs-msg{border:1px solid #eee;border-radius:12px;margin-bottom:10px;overflow:hidden;}'
    + '.sxs-msg-head{padding:12px;display:flex;justify-content:space-between;gap:8px;cursor:pointer;align-items:center;}'
    + '.sxs-msg-head .sm-t{font-weight:600;}'
    + '.sxs-msg-head .sm-m{color:#e8862e;font-weight:700;}'
    + '.sxs-msg-head .sm-s{font-size:12px;color:#888;}'
    + '.sxs-msg-body{padding:0 12px 12px;display:none;border-top:1px solid #f2f2f2;}'
    + '.sxs-empty{text-align:center;color:#aaa;padding:40px 0;}'
    + '.sxs-red{color:#e23b3b;}'
    + '.sxs-od-price{font-size:11px;color:#e23b3b;white-space:nowrap;}'
    + '.sxs-od-bot{display:flex;align-items:center;justify-content:space-between;padding-top:6px;border-top:1px solid #f8f8f8;margin-top:4px;gap:8px;}'
    + '.sxs-od-ctrl{display:flex;align-items:center;gap:6px;justify-content:flex-end;flex-wrap:wrap;}'
    + '.sxs-od-qty{width:48px;padding:5px;border:1px solid #ddd;border-radius:7px;text-align:center;font-family:inherit;font-size:13px;}'
    + '.sxs-od-btn{padding:5px 10px;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-family:inherit;}'
    + '.sxs-od-add{display:block;width:100%;margin:6px 0 10px;padding:9px;background:#fff3e9;color:#e8862e;border:1px dashed #e8862e;border-radius:10px;font-weight:600;cursor:pointer;font-family:inherit;}'
    + '.sxs-od-submit{width:100%;padding:12px;background:#07c160;color:#fff;border:none;border-radius:12px;font-weight:700;font-size:15px;cursor:pointer;font-family:inherit;margin-top:6px;}'
    + '#sxsAddMask{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:210;display:none;align-items:flex-end;justify-content:center;}'
    + '#sxsAddPanel{width:100%;max-width:400px;background:#fff;border-radius:16px 16px 0 0;padding:14px;max-height:70vh;overflow:auto;}'
    + '.sxs-add-row{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid #f0f0f0;}'
    + '.sxs-add-icon{font-size:22px;flex-shrink:0;}'
    + '.sxs-add-info{flex:1;min-width:0;}'
    + '.sxs-add-name{font-size:13px;font-weight:500;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.25;}'
    + '.sxs-add-sub{font-size:11px;color:#999;margin-top:2px;}'
    + '.sxs-qty{width:52px;padding:6px;border:1px solid #ccc;border-radius:7px;text-align:center;font-family:inherit;font-size:13px;}'
    + '.sxs-step{width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;background:#f2f2f2;color:#333;border-radius:7px;cursor:pointer;font-size:16px;font-family:inherit;user-select:none;}'
    + '.sxs-add-go{background:#07c160;color:#fff;border:none;border-radius:8px;padding:6px 14px;font-weight:600;cursor:pointer;font-family:inherit;font-size:13px;}'
    + '.sxs-od-head{font-size:13px;color:#888;margin:6px 0;}'
    + '.sxs-od-btn-row{display:flex;gap:10px;margin-bottom:10px;}'
    + '.sxs-od-btn-row .sxs-od-add-inline,.sxs-od-btn-row .sxs-od-ai-btn{flex:1;text-align:center;padding:7px 0;border-radius:9px;font-weight:600;cursor:pointer;font-family:inherit;font-size:12px;white-space:nowrap;}'
    + '.sxs-od-add-inline{background:#fff3e9;color:#e8862e;border:1px dashed #e8862e;}'
    + '.sxs-od-ai-btn{background:#185fa5;color:#fff;border:1px solid #185fa5;}'
    + '.sxs-od-item{border:1px solid #f0f0f0;border-radius:10px;padding:10px;margin-bottom:8px;}'
    + '.sxs-od-top{display:flex;align-items:center;gap:7px;margin-bottom:6px;}'
    + '.sxs-od-left{display:flex;align-items:center;gap:7px;flex:1;min-width:0;}'
    + '.sxs-od-emoji{font-size:18px;flex-shrink:0;}'
    + '.sxs-od-info{flex:1;min-width:0;display:flex;flex-wrap:wrap;align-items:baseline;gap:3px 8px;}'
    + '.sxs-od-name{font-weight:600;white-space:normal;line-height:1.3;}'
    + '.sxs-od-meta{font-size:12px;color:#999;}'
    + '#sxsAiRevMask{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:230;display:none;align-items:center;justify-content:center;}'
    + '#sxsAiRevPanel{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:92%;max-width:420px;max-height:82vh;background:#fff;border-radius:16px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.25);}'
    + '.sxs-ai-rev-body{padding:12px 16px;overflow-y:auto;}'
    + '#sxsAiMask{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:220;display:none;align-items:center;justify-content:center;}'
    + '#sxsAiPanel{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:92%;max-width:340px;max-height:70vh;background:#fff;border-radius:16px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.25);}'
    + '.sxs-ai-tip{padding:8px 14px;font-size:12px;color:#888;}'
    + '.sxs-ai-input{flex:1;min-height:90px;margin:0 14px;border:1px solid #ddd;border-radius:10px;padding:10px;font-family:inherit;font-size:13px;line-height:1.6;resize:none;}'
    + '.sxs-add-filter{display:flex;gap:6px;overflow-x:auto;padding:2px 0 8px;border-bottom:1px solid #f2f2f2;}'
    + '.sxs-add-filter .f-chip{padding:5px 12px;background:#f2f2f2;border-radius:16px;font-size:12px;white-space:nowrap;cursor:pointer;font-family:inherit;}'
    + '.sxs-add-filter .f-chip.active{background:#534AB7;color:#fff;}'
    + '.sxs-add-search{width:100%;padding:9px 12px;border:1px solid #ddd;border-radius:10px;font-size:13px;font-family:inherit;margin:6px 0 2px;box-sizing:border-box;}'
    + '.sxs-add-suprow{display:flex;gap:8px;margin:0 0 8px;}'
    + '.msf-btn{padding:6px 14px;background:#f2f2f2;border-radius:16px;font-size:12px;white-space:nowrap;cursor:pointer;font-family:inherit;border:none;}'
    + '.msf-btn.active{background:#534AB7;color:#fff;}'
    + '.sxs-add-name, .sar-name{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.25;}'
    + '.sxs-qty{width:46px;padding:6px;border:1px solid #ccc;border-radius:7px;text-align:center;font-family:inherit;font-size:13px;}'
    + '.sxs-ai-foot{padding:10px 14px;border-top:1px solid #f2f2f2;}'
    + '.sxs-toggle{position:relative;display:inline-block;width:42px;height:22px;flex-shrink:0;}'
    + '.sxs-toggle input{opacity:0;width:0;height:0;margin:0;}'
    + '.sxs-slider{position:absolute;cursor:pointer;inset:0;background:#d0d0d0;border-radius:22px;transition:.2s;}'
    + '.sxs-slider:before{content:"";position:absolute;height:16px;width:16px;left:3px;top:3px;background:#fff;border-radius:50%;transition:.2s;box-shadow:0 1px 3px rgba(0,0,0,.3);}'
    + '.sxs-toggle input:checked + .sxs-slider{background:#07c160;}'
    + '.sxs-toggle input:checked + .sxs-slider:before{transform:translateX(20px);}';
  document.head.appendChild(st);

  if(!document.getElementById('sxsNotifMask')){
    var mask = document.createElement('div'); mask.id='sxsNotifMask';
    var _ne = localStorage.getItem('sxs_notif_enabled'); if(_ne!=='0') _ne='1';
    mask.innerHTML = '<div id="sxsNotifPanel"><div class="sxs-nc-title">'
      +'<span style="display:flex;align-items:center;gap:10px;">🔔 消息中心'
      +'<label class="sxs-toggle" title="开启 / 关闭铃铛提醒"><input type="checkbox" id="ncNotifSwitch" '+( _ne==='1'?'checked':'')+' onchange="toggleNotifEnabled(this)"><span class="sxs-slider"></span></label></span>'
      +'<span class="sxs-nc-close" onclick="closeNotifCenter()">×</span>'
      +'</div><div class="sxs-nc-body" id="sxsNotifList"></div></div>';
    mask.onclick = function(e){ if(e.target===this) closeNotifCenter(); };
    document.body.appendChild(mask);
  }
  if(!document.getElementById('sxsAddMask')){
    var am = document.createElement('div'); am.id='sxsAddMask';
    am.innerHTML = '<div id="sxsAddPanel"><div class="sxs-nc-title"><span>➕ 添加商品</span><span class="sxs-nc-close" onclick="closeSxsAdd()">×</span></div><div id="sxsAddBody" style="padding:6px 0;"></div></div>';
    am.onclick = function(e){ if(e.target===this) closeSxsAdd(); };
    document.body.appendChild(am);
  }
  if(!document.getElementById('sxsAiMask')){
    var aim=document.createElement('div'); aim.id='sxsAiMask';
    aim.innerHTML='<div id="sxsAiPanel"><div class="sxs-nc-title"><span>AI批量录入</span><span class="sxs-nc-close" onclick="closeSxsAiAdd()">×</span></div><div class="sxs-ai-tip">AI 批量编辑 / 增加商品清单。格式：商品名 数量 单位（如：土豆30斤 五花肉10斤）</div><textarea id="sxsAiInput" class="sxs-ai-input" placeholder="商品名 数量 单位，如：土豆30斤 五花肉10斤" oninput="sxsAiGrow(this)"></textarea><div class="sxs-ai-foot"><button class="sxs-od-submit" onclick="sxsAiAddSend()">发送</button></div></div>';
    aim.onclick=function(e){ if(e.target===this) closeSxsAiAdd(); };
    document.body.appendChild(aim);
  }
  if(!document.getElementById('sxsAiRevMask')){
    var rvm=document.createElement('div'); rvm.id='sxsAiRevMask';
    rvm.innerHTML='<div id="sxsAiRevPanel"><div class="sxs-nc-title"><span>🤖 AI识别结果 · 二次确认</span><span class="sxs-nc-close" onclick="closeSxsAiRev()">×</span></div><div class="sxs-ai-rev-body" id="sxsAiRevBody"></div><div class="sxs-ai-foot"><button class="sxs-od-submit" onclick="sxsAiReviewConfirmAll()">确认添加到采购单</button></div></div>';
    rvm.onclick=function(e){ if(e.target===this) closeSxsAiRev(); };
    document.body.appendChild(rvm);
  }
}

function openNotifCenter(){
  ensureNotifBell();
  injectNotifCenter();
  var mask = document.getElementById('sxsNotifMask');
  if(mask) mask.style.display='flex';
  renderNotifList();
}
function closeNotifCenter(){ var m=document.getElementById('sxsNotifMask'); if(m) m.style.display='none'; }
function toggleNotifEnabled(el){
  var on = el.checked;
  localStorage.setItem('sxs_notif_enabled', on?'1':'0');
  if(on){ try{ updateNotifBell(); }catch(e){} }
  else { var b=document.getElementById('sxsBell'); if(b) b.style.display='none'; }
  toast(on? '铃铛提醒已开启' : '铃铛提醒已关闭');
}
var SXS_EMOJIS=['🍜','🍚','🍲','🍛','🍱','🥘','🍕','🍔','🍟','🌭','🥪','🍳','🥗','🍤','🦐','🐟','🥩','🍗','🥓','🍖','🥚','🧀','🥛','☕','🍵','🥤','🍎','🍊','🍋','🍉','🍇','🍓','🥝','🍅','🥕','🥦','🥬','🌽','🥔','🧄','🧅','🍄','🌰','🥜','🍞','🥐','🥖','🧇','🥯','🍰','🍪','🍩','🍫','🍬','🍭','🍿','🥟','🍢','🍡','🧆','🥠','🍯','🥑','🍆','🥒','🫑','🥭','🍑','🍐','🍈','🍒','🍍','🥥','🫐','🍌','🍽️','🍴','🥄','📦','🛒','🏪','🏭','⭐','✅','❤️','🔥','💡','📌','📋','💰','💵','🧾','📊','📈','📉','🗓️','⏰','📱','🎯','✨','⚡','🌟','💎','🏆','🎉','🚀','📞','📧','📝','🔔','📣','🏷️','💼','🌈','🌸','🌺','🌻','🌹','🍀','🌿','🍃','🌳','🌲','🌴','🌵','⛰️','🌊','🏠','🏢','🎡','🚗','🚕','🚌','🚚','🚜','✈️','📍','🔑','🔒','🔓','⚙️','🔧','🔨','🧰','🔬','💊','🩺','🌡️','🚒','🧯','📚','🗂️','📁','📂','🔖','🎁','🎈','🎀'];
var _emojiTarget='';
function openEmojiPicker(inputId){
  _emojiTarget=inputId;
  var m=document.getElementById('sxsEmojiMask');
  if(!m){
    m=document.createElement('div'); m.id='sxsEmojiMask';
    m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:240;display:none;align-items:flex-end;justify-content:center;';
    m.innerHTML='<div style="background:#fff;border-radius:16px 16px 0 0;width:100%;max-width:420px;max-height:72vh;display:flex;flex-direction:column;overflow:hidden;"><div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid #eee;font-weight:700;font-size:16px;"><span>🙂 选择图标</span><span onclick="closeEmojiPicker()" style="font-size:24px;line-height:1;cursor:pointer;color:#999;">×</span></div><div id="sxsEmojiGrid" style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px;padding:14px;overflow-y:auto;"></div></div>';
    m.onclick=function(e){ if(e.target===this) closeEmojiPicker(); };
    document.body.appendChild(m);
  }
  var grid=document.getElementById('sxsEmojiGrid');
  grid.innerHTML=SXS_EMOJIS.map(function(e){ return '<span onclick="pickEmoji(\''+e+'\')" style="font-size:24px;text-align:center;padding:8px 0;cursor:pointer;border-radius:8px;" onmouseover="this.style.background=\'#f2f0ff\'" onmouseout="this.style.background=\'\'">'+e+'</span>'; }).join('');
  m.style.display='flex';
}
function pickEmoji(e){ var el=document.getElementById(_emojiTarget); if(el) el.value=e; closeEmojiPicker(); }
function closeEmojiPicker(){ var m=document.getElementById('sxsEmojiMask'); if(m) m.style.display='none'; }
function _sxsEsc(s){ return String(s==null?'':s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function _sxsMyPendingOrders(){
  var user=getCurrentUser(); if(!user) return [];
  var orders=loadJSON('sxs_purchase_orders')||[];
  var role=user.role;
  return orders.filter(function(o){
    if(role==='chef') return o.status==='chef_pending';
    if(role==='boss') return o.status==='chef_pending'||o.status==='boss_pending';
    if(role==='keeper') return o.status==='pending_receive';
    if(role==='buyer') return o.status==='pending_buy'||o.status==='approved';
    return false;
  });
}
function renderNotifList(){
  var box=document.getElementById('sxsNotifList'); if(!box) return;
  var orders=_sxsMyPendingOrders().slice().sort(function(a,b){ return (b.createdAt||0)-(a.createdAt||0); });
  if(!orders.length){ box.innerHTML='<div class="sxs-empty">🎉 暂无待处理消息</div>'; return; }
  var h='';
  orders.forEach(function(o){
    var stLabel = o.status==='chef_pending'?'待厨师长审核':(o.status==='boss_pending'?'待老板审批':(o.status==='pending_receive'?'待验收':((o.status==='pending_buy'||o.status==='approved')?'待采购':o.status)));
    var title = o.source==='keeper' ? '库存提交了采购单' : (o.buyerName||'采购单');
    h += '<div class="sxs-msg">';
    h += '<div class="sxs-msg-head" onclick="sxsToggleMsg(\''+o.id+'\')">';
    h += '<span class="sm-t">📋 '+_sxsEsc(title)+'</span>';
    h += '<span class="sm-m">¥'+fmt0(o.total)+'</span>';
    h += '<span class="sm-s">'+stLabel+'</span>';
    h += '</div>';
    h += '<div class="sxs-msg-body" id="sxsMsgBody_'+o.id+'"></div>';
    h += '</div>';
  });
  box.innerHTML=h;
}
function sxsToggleMsg(oid){
  var body=document.getElementById('sxsMsgBody_'+oid); if(!body) return;
  if(body.style.display!=='block'){
    var orders=loadJSON('sxs_purchase_orders')||[];
    var o=orders.find(function(x){ return x.id===oid; });
    if(!o){ body.innerHTML='<div class="sxs-empty">订单不存在</div>'; body.style.display='block'; return; }
    sxsRenderOrderDetail(body, o);
    body.style.display='block';
  } else {
    body.style.display='none';
    body.innerHTML='';
  }
}
function sxsRenderOrderDetail(el, o){
  var user=getCurrentUser(); var role=user?user.role:'';
  var canApprove = (role==='chef'||role==='boss') && (o.status==='chef_pending'||o.status==='boss_pending');
  var isReceive = (role==='keeper'&&o.status==='pending_receive') || (role==='buyer'&&(o.status==='pending_buy'||o.status==='approved'));
  var h='<div class="sxs-od-head">📋 '+(o.keeperName||o.buyerName||'仓管')+' 发起 · '+(o.date||'')+' · '+(o.time||'')+'</div>';
  h += '<div class="sxs-od-btn-row"><button class="sxs-od-add-inline" onclick="sxsAddItemToOrder(\''+o.id+'\')">＋ 手动添加</button><button class="sxs-od-add-inline sxs-od-ai-btn" onclick="sxsOpenAiRec(\''+o.id+'\')">🤖 AI 录入</button></div>';
  (o.items||[]).forEach(function(it, idx){
    h += sxsOdItemHTML(it, o.id, idx, 'order');
  });
  if(canApprove){
    h += '<button class="sxs-od-submit" onclick="sxsAdvanceOrder(\''+o.id+'\')">批量确认并发送</button>';
  } else if(isReceive){
    h += '<button class="sxs-od-submit" onclick="sxsSubmitReceive(\''+o.id+'\')">批量确认并提交</button>';
  }
  el.innerHTML=h;
}
// 采购单商品卡片（order=已加进采购单；review=AI识别待二次确认），上级采购单与AI识别结果统一此样式
function sxsOdItemHTML(it, oid, idx, mode){
  var rs = (typeof getRealStock==='function') ? getRealStock(it.name) : null;
  var lps = (typeof getLastPrices==='function') ? getLastPrices() : {};
  var lp = (lps && lps[it.name]) ? lps[it.name] : 0;
  var unit = it.unit||'';
  var meta = '<span class="sxs-red">库存'+(rs!==null?fmt0(rs):(it.stockAtSend||0))+unit+'</span>'
           + ' · <span class="sxs-red">建议采购'+fmt0(it.suggestQty||it.qty)+unit+'</span>';
  var priceHtml = '<span class="sxs-od-price">上次价：¥'+fmt0(lp>0?lp:(it.price>0?it.price:0))+'</span>';
  var ctrl='';
  if(mode==='order'){
    ctrl = '<span class="sxs-step" onclick="sxsStepQty(\'sxsact_'+oid+'_'+idx+'\',-1);sxsConfirmItem(\''+oid+'\','+idx+')">-</span>'
         + '<input id="sxsact_'+oid+'_'+idx+'" type="number" min="0" step="0.01" value="'+(Number(it.qty)||Number(it.suggestQty)||0)+'" class="sxs-od-qty">'
         + '<span class="sxs-step" onclick="sxsStepQty(\'sxsact_'+oid+'_'+idx+'\',1);sxsConfirmItem(\''+oid+'\','+idx+')">+</span>'
         + '<button class="sxs-od-btn" style="background:#07c160;color:#fff" onclick="sxsConfirmItem(\''+oid+'\','+idx+')">确认</button>'
         + '<button class="sxs-od-btn" style="background:#fde8e8;color:#e23b3b" onclick="sxsKickItem(\''+oid+'\','+idx+')">✕</button>';
  } else {
    ctrl = '<span class="sxs-step" onclick="sxsStepQty(\'sxsrev_'+idx+'\',-1)">-</span>'
         + '<input id="sxsrev_'+idx+'" type="number" min="0" step="0.01" value="'+(Number(it.qty)||0)+'" class="sxs-od-qty">'
         + '<span class="sxs-step" onclick="sxsStepQty(\'sxsrev_'+idx+'\',1)">+</span>'
         + '<button class="sxs-od-btn" style="background:#07c160;color:#fff" onclick="sxsAiReviewAddOne('+idx+')">确认</button>'
         + '<button class="sxs-od-btn" style="background:#fde8e8;color:#e23b3b" onclick="sxsAiReviewDrop('+idx+')">✕</button>';
  }
  return '<div class="sxs-od-item">'
       + '<div class="sxs-od-top"><span class="sxs-od-emoji">'+(it.emoji||'📦')+'</span>'
       + '<div class="sxs-od-info"><span class="sxs-od-name">'+_sxsEsc(it.name)+'</span>'
       + '<span class="sxs-od-meta">'+meta+'</span></div></div>'
       + '<div class="sxs-od-bot">'+priceHtml+'<span class="sxs-od-ctrl">'+ctrl+'</span></div></div>';
}
function sxsConfirmItem(oid, idx){
  var el=document.getElementById('sxsact_'+oid+'_'+idx); var qty=el?Number(el.value)||0:0;
  var orders=loadJSON('sxs_purchase_orders'); var o=orders.find(function(x){ return x.id===oid; }); if(!o||!o.items[idx]) return;
  o.items[idx].actualQty=qty; o.items[idx].qty=qty; saveJSON('sxs_purchase_orders', orders);
  var b=document.getElementById('sxsMsgBody_'+oid); if(b&&b.style.display==='block'){ sxsRenderOrderDetail(b, o); }
}
function sxsKickItem(oid, idx){
  if(!window.confirm('确定踢除该商品？')) return;
  var orders=loadJSON('sxs_purchase_orders'); var o=orders.find(function(x){ return x.id===oid; }); if(!o||!o.items[idx]) return;
  o.items.splice(idx,1); o.total=(o.items||[]).reduce(function(s,x){ return s+Number(x.qty)*Number(x.price); },0);
  saveJSON('sxs_purchase_orders', orders);
  var b=document.getElementById('sxsMsgBody_'+oid); if(b) sxsRenderOrderDetail(b, o);
}
function sxsAdvanceOrder(oid){
  var orders=loadJSON('sxs_purchase_orders'); var o=orders.find(function(x){ return x.id===oid; }); if(!o) return;
  var user=getCurrentUser();
  var actor = o.status==='chef_pending' ? 'chef' : (o.status==='boss_pending' ? 'boss' : (user?user.role:'keeper'));
  var next=getNextStatus(actor);
  o.status=next; o.auditorId=user?user.id:''; o.auditorName=user?user.name:''; o.auditTime=nowTimeStr();
  if(user&&user.role==='boss'){ o.bossEdits={ time:todayStr()+' '+nowTimeStr(), editor:getUserName() }; }
  else if(user&&user.role==='chef'){ o.chefEdits={ time:todayStr()+' '+nowTimeStr(), editor:getUserName() }; }
  saveJSON('sxs_purchase_orders', orders);
  addLog('review_approve','通过采购单 ¥'+fmt0(o.total)+' → '+next,'purchase');
  toast('已通过并发送 ✅', true);
  updateNotifBell();
  if(document.getElementById('sxsNotifMask') && document.getElementById('sxsNotifMask').style.display!=='none') renderNotifList();
}
function sxsSubmitReceive(oid){
  var orders=loadJSON('sxs_purchase_orders'); var o=orders.find(function(x){ return x.id===oid; }); if(!o) return;
  var user=getCurrentUser(); var role=user?user.role:'';
  (o.items||[]).forEach(function(it){ if(it.actualQty===undefined){ it.actualQty=Number(it.qty)||0; } });
  if(role==='keeper'){
    // 仓管验收：真正入库（复刻 kucun.performReceive 核心，保证在任意页面都能完成验收）
    o.status='received';
    o.receiverId=user?user.id:'';
    o.receiverName=getUserName();
    o.receiveTime=todayStr()+' '+nowTimeStr();
    var kucun=loadObj('sxs_kucun'); var prods=loadJSON('sp_prods'); var total=0;
    (o.items||[]).forEach(function(it){
      var prod=prods.find(function(p){return p.name===it.name;});
      var key=prod?prod.id:it.name;
      kucun[key]=(kucun[key]||0)+Number(it.actualQty||it.qty||0);
      if(prod){ prod.lastPrice=Number(it.price)||prod.lastPrice; prod.purchaseCount=(prod.purchaseCount||0)+1; }
      total+=Number(it.actualQty||it.qty||0)*Number(it.price||0);
    });
    saveJSON('sxs_kucun',kucun); saveJSON('sp_prods',prods);
    var records=loadJSON('sxs_purchase_records');
    records.unshift({ id:'rec_'+Date.now(), date:todayStr(), time:nowTimeStr(), items:(o.items||[]).map(function(r){return {name:r.name,qty:Number(r.actualQty||r.qty||0),unit:r.unit};}), total:total, userId:user?user.id:'', userName:getUserName() });
    if(records.length>100) records=records.slice(0,100);
    saveJSON('sxs_purchase_records',records);
    addLog('keeper_receive','仓管验收入库 ¥'+fmt0(total),'purchase');
    saveJSON('sxs_purchase_orders',orders);
    toast('已验收入库 ✅',true);
  } else {
    // 采购员确认采购 → 待仓管验收
    o.status='pending_receive'; o.buyerConfirmedAt=Date.now();
    saveJSON('sxs_purchase_orders', orders);
    addLog('purchase_buy_confirm','采购员确认采购 ¥'+fmt0(o.total)+' → 待仓管验收','purchase');
    toast('已确认并提交，待仓管验收 ✅','✅');
  }
  updateNotifBell();
  if(document.getElementById('sxsNotifMask') && document.getElementById('sxsNotifMask').style.display!=='none') renderNotifList();
  if(typeof renderKeeperTasks==='function'){ try{ renderKeeperTasks(); }catch(e){} }
  if(typeof updateTaskRecordBadge==='function'){ try{ updateTaskRecordBadge(); }catch(e){} }
  if(typeof updateKcReceiveBadge==='function'){ try{ updateKcReceiveBadge(); }catch(e){} }
  if(typeof refreshReceiveViews==='function'){ try{ refreshReceiveViews(); }catch(e){} }
}
function sxsGetProdLib(){ try{ var d=localStorage.getItem('sp_prods'); return d?JSON.parse(d):[]; }catch(e){ return []; } }
function sxsGetCatLib(){ try{ var d=localStorage.getItem('sp_cats'); return d?JSON.parse(d):[]; }catch(e){ return []; } }
function sxsGetCatName(id){ var c=sxsGetCatLib().find(function(x){return x.id===id;}); return c?c.name:''; }

var sxsAddCat=null, sxsAddKw='', sxsAddSup='';
function sxsAddItemToOrder(oid){
  sxsCurAddOid=oid;
  sxsAiRecOid='';
  sxsAddSup='';
  var am=document.getElementById('sxsAddMask'); if(!am) return;
  sxsRenderAddBody(oid, true);
  am.style.display='flex';
}
function sxsRenderAddBody(oid, full){
  var prods=sxsGetProdLib();
  var catIds;
  if(sxsAddCat){
    var cats=sxsGetCatLib();
    catIds=[sxsAddCat];
    cats.filter(function(x){return x.parentId===sxsAddCat;}).forEach(function(c){ catIds.push(c.id); });
  }
  var list = catIds ? prods.filter(function(p){ return catIds.indexOf(p.catId)!==-1; }) : prods;
  if(sxsAddKw){ list = list.filter(function(p){ return (p.name||'').toLowerCase().indexOf(sxsAddKw)>=0; }); }
  if(sxsAddSup==='has'){ list = list.filter(function(p){ return (p.supplier||'')!==''; }); }
  if(sxsAddSup==='none'){ list = list.filter(function(p){ return (p.supplier||'')===''; }); }
  var hList='';
  if(!list.length){ hList='<div style="text-align:center;color:#aaa;padding:24px 0;">暂无商品</div>'; }
  list.forEach(function(p){
    var pi=prods.indexOf(p);
    var cons=sxsTodayConsume(p.id);
    var price=Number(p.lastPrice||p.price||0);
    hList += '<div class="sxs-add-row">'
       + '<span class="sxs-add-icon">'+(p.emoji||'📦')+'</span>'
       + '<div class="sxs-add-info"><div class="sxs-add-name">'+_sxsEsc(p.name)+'</div>'
       + '<div class="sxs-add-sub">¥'+price.toFixed(2)+'/'+(p.unit||'')+' · 今日消耗 '+fmt0(cons)+(p.unit||'')+'</div></div>'
       + '<span class="sxs-step" onclick="sxsStepQty(\'sxsaddqty_'+pi+'\',-1)">-</span>'
       + '<input id="sxsaddqty_'+pi+'" class="sxs-qty" type="number" min="0" step="1" value="1">'
       + '<span class="sxs-step" onclick="sxsStepQty(\'sxsaddqty_'+pi+'\',1)">+</span>'
       + '<button class="sxs-add-go" onclick="sxsAddPickQty(\''+oid+'\','+pi+')">加</button>'
       + '</div>';
  });
  var body=document.getElementById('sxsAddBody');
  if(full){
    var h='';
    h += '<div class="sxs-add-suprow">';
    h += '<span class="msf-btn'+(sxsAddSup===''?' active':'')+'" onclick="sxsAddSetSup(\'\')">全部</span>';
    h += '<span class="msf-btn'+(sxsAddSup==='has'?' active':'')+'" onclick="sxsAddSetSup(\'has\')">有供应商</span>';
    h += '<span class="msf-btn'+(sxsAddSup==='none'?' active':'')+'" onclick="sxsAddSetSup(\'none\')">无供应商</span>';
    h += '</div>';
    h += '<div class="sxs-add-filter">';
    h += '<span class="f-chip'+(sxsAddCat?'':' active')+'" onclick="sxsAddFilter(null)">全部</span>';
    sxsGetCatLib().filter(function(x){return x.level===1 && x.name!=='固定费用';}).forEach(function(c){
      h += '<span class="f-chip'+(sxsAddCat===c.id?' active':'')+'" onclick="sxsAddFilter(\''+c.id+'\')">'+_sxsEsc(c.name)+'</span>';
    });
    h += '</div>';
    h += '<input id="sxsAddSearch" class="sxs-add-search" placeholder="🔍 搜索商品..." value="'+(sxsAddKw||'')+'" oninput="sxsAddSearch()">';
    h += '<div id="sxsAddList">'+hList+'</div>';
    h += '<button class="sxs-od-submit" onclick="closeSxsAdd()">完成</button>';
    if(body) body.innerHTML=h;
  } else {
    var listEl=document.getElementById('sxsAddList'); if(listEl) listEl.innerHTML=hList;
  }
}
function sxsAddFilter(catId){ sxsAddCat=catId; sxsRenderAddBody(sxsCurAddOid, true); }
function sxsAddSetSup(v){ sxsAddSup=v; sxsRenderAddBody(sxsCurAddOid, true); }
function sxsAddSearch(){
  var el=document.getElementById('sxsAddSearch'); sxsAddKw=el?(el.value||'').trim().toLowerCase():'';
  sxsRenderAddBody(sxsCurAddOid, false);
}
function sxsAddPickQty(oid, pi){
  var prods=apGetProds(); var p=prods[pi]; if(!p) return;
  var qel=document.getElementById('sxsaddqty_'+pi); var q=qel?Math.max(1,parseFloat(qel.value)||1):1;
  var orders=loadJSON('sxs_purchase_orders'); var o=orders.find(function(x){ return x.id===oid; }); if(!o) return;
  var exist=o.items.find(function(it){ return it.name===p.name; });
  if(exist){ exist.qty=Number(exist.qty)+q; }
  else { o.items.push({ name:p.name, emoji:p.emoji||'📦', qty:q, unit:p.unit||'斤', price:Number(p.price||0), supplier:p.supplier||'', supplierId:p.supplierId||'' }); }
  o.total=(o.items||[]).reduce(function(s,x){ return s+Number(x.qty)*Number(x.price); },0);
  saveJSON('sxs_purchase_orders', orders);
  var b=document.getElementById('sxsMsgBody_'+oid); if(b&&b.style.display==='block'){ sxsRenderOrderDetail(b, o); }
  if(typeof sxsAfterOrderItemChange==='function'){ try{ sxsAfterOrderItemChange(oid); }catch(e){} }
  toast('已添加：'+p.name+' '+fmt0(q)+(p.unit||''),'✅');
}
// sxsAddManual 已移除（手动录入行删除，2026-07-15）

function closeSxsAdd(){ var m=document.getElementById('sxsAddMask'); if(m) m.style.display='none'; }
var sxsCurAddOid='';
var sxsAiRecItems=[];
var sxsAiRecOid='';
var sxsAiKucunMode=false;
function sxsTodayConsume(prodId){
  try{
    var recs=JSON.parse(localStorage.getItem('sxs_out_records')||'[]');
    var td=todayStr(); var sum=0;
    recs.forEach(function(r){
      if(r.date!==td) return;
      (r.items||[]).forEach(function(it){ if(it.productId===prodId) sum+=(Number(it.qty)||0); });
    });
    return sum;
  }catch(e){ return 0; }
}
function sxsStepQty(inputId, delta){
  var el=document.getElementById(inputId); if(!el) return;
  var v=parseFloat(el.value)||0; v=Math.max(0, v+delta);
  el.value=v;
}
function openSxsAiAdd(){
  var m=document.getElementById('sxsAiMask'); if(!m) return;
  var ta=document.getElementById('sxsAiInput'); if(ta){ ta.value=''; sxsAiGrow(ta); }
  m.style.display='flex';
  if(window.visualViewport){ try{ window.visualViewport.addEventListener('resize', sxsAiViewportFix); }catch(e){} }
  if(ta) setTimeout(function(){ try{ ta.focus(); }catch(e){} }, 60);
}
function closeSxsAiAdd(){
  var m=document.getElementById('sxsAiMask'); if(m) m.style.display='none';
  var panel=document.getElementById('sxsAiPanel'); if(panel) panel.style.transform='';
  sxsAiKucunMode=false;
  if(window.visualViewport){ try{ window.visualViewport.removeEventListener('resize', sxsAiViewportFix); }catch(e){} }
}
function sxsAiGrow(ta){ if(!ta) return; ta.style.height='auto'; ta.style.height=Math.min(ta.scrollHeight, 240)+'px'; }
function sxsAiViewportFix(){
  var panel=document.getElementById('sxsAiPanel'); if(!panel) return;
  var vv=window.visualViewport;
  if(vv){
    var kb=Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    panel.style.transform = kb>0 ? 'translate(-50%, calc(-50% - '+(kb/2)+'px))' : 'translate(-50%,-50%)';
  }
}
function sxsAiAddSend(){
  var ta=document.getElementById('sxsAiInput'); if(!ta) return;
  var text=ta.value.trim(); if(!text){ toast('说点什么吧'); return; }
  var lines=text.split(/\n|；|;/).map(function(s){return s.trim();}).filter(Boolean);
  // 库存模式（来自库存页「AI录入」按钮）：识别结果直接并入 AI推荐清单
  if(sxsAiKucunMode){
    var krecs=[];
    lines.forEach(function(line){
      var q=apExtractQty(line); var prod=apFindProd(line);
      if(prod && q){
        krecs.push({ name:prod.name, emoji:prod.emoji||'📦', qty:q.qty, unit:q.unit||prod.unit||'斤', price:Number(prod.price||0), supplier:prod.supplier||'', supplierId:prod.supplierId||'' });
      }
    });
    if(!krecs.length){ toast('没识别到商品，换个说法试试'); return; }
    closeSxsAiAdd(); sxsAiKucunMode=false;
    if(typeof sxsKucunAiApply==='function') sxsKucunAiApply(krecs);
    return;
  }
  // 二次审核模式（来自采购单的「AI录入」按钮）
  if(sxsAiRecOid){
    var recs=[];
    lines.forEach(function(line){
      var q=apExtractQty(line); var prod=apFindProd(line);
      if(prod && q){
        recs.push({ name:prod.name, emoji:prod.emoji||'📦', qty:q.qty, unit:q.unit||prod.unit||'斤', price:Number(prod.price||0), supplier:prod.supplier||'', supplierId:prod.supplierId||'', suggestQty:q.qty });
      }
    });
    if(!recs.length){ toast('没识别到商品，换个说法试试'); return; }
    sxsAiRecItems=recs;
    closeSxsAiAdd();
    sxsShowAiReview();
    return;
  }
  // 原模式：来自「添加商品」弹窗的 AI批量输入，直接加入采购单
  var oid=sxsCurAddOid; if(!oid){ toast('请先打开添加商品'); return; }
  var orders=loadJSON('sxs_purchase_orders'); var o=orders.find(function(x){ return x.id===oid; }); if(!o){ closeSxsAiAdd(); return; }
  var added=[];
  lines.forEach(function(line){
    var q=apExtractQty(line); var prod=apFindProd(line);
    if(prod && q){
      var addQty=q.qty;
      var exist=o.items.find(function(it){ return it.name===prod.name; });
      if(exist){ exist.qty=Number(exist.qty)+addQty; }
      else { o.items.push({ name:prod.name, emoji:prod.emoji||'📦', qty:addQty, unit:prod.unit||'斤', price:Number(prod.price||0), supplier:prod.supplier||'', supplierId:prod.supplierId||'' }); }
      added.push(prod.name+' '+fmt0(addQty)+(q.unit||prod.unit||''));
    }
  });
  o.total=(o.items||[]).reduce(function(s,x){ return s+Number(x.qty)*Number(x.price); },0);
  saveJSON('sxs_purchase_orders', orders);
  var b=document.getElementById('sxsMsgBody_'+oid); if(b&&b.style.display==='block'){ sxsRenderOrderDetail(b, o); }
  closeSxsAiAdd();
  if(added.length) toast('已批量添加：'+added.join('、'),'✅');
  else toast('没识别到商品，换个说法试试');
}
// ════════ AI录入 → 二次审核流程（采购单「AI录入」按钮） ════════
function sxsOpenAiRec(oid){ sxsAiRecOid=oid; openSxsAiAdd(); }
function closeSxsAiRev(){ var m=document.getElementById('sxsAiRevMask'); if(m) m.style.display='none'; }
function sxsShowAiReview(){
  var body=document.getElementById('sxsAiRevBody'); if(!body) return;
  if(!sxsAiRecItems.length){ closeSxsAiRev(); return; }
  var h='';
  sxsAiRecItems.forEach(function(it, idx){ h += sxsOdItemHTML(it, '', idx, 'review'); });
  body.innerHTML=h;
  var m=document.getElementById('sxsAiRevMask'); if(m) m.style.display='flex';
}
function sxsAiPushToOrder(oid, it){
  var orders=loadJSON('sxs_purchase_orders'); var o=orders.find(function(x){ return x.id===oid; }); if(!o) return;
  var exist=o.items.find(function(x){ return x.name===it.name; });
  if(exist){ exist.qty=Number(exist.qty)+Number(it.qty); }
  else { o.items.push({ name:it.name, emoji:it.emoji||'📦', qty:Number(it.qty), unit:it.unit||'斤', price:Number(it.price||0), supplier:it.supplier||'', supplierId:it.supplierId||'' }); }
  o.total=(o.items||[]).reduce(function(s,x){ return s+Number(x.qty)*Number(x.price); },0);
  saveJSON('sxs_purchase_orders', orders);
  if(typeof sxsAfterOrderItemChange==='function'){ try{ sxsAfterOrderItemChange(oid); }catch(e){} }
}
function sxsRefreshOrderDetail(oid){
  var b=document.getElementById('sxsMsgBody_'+oid);
  if(b&&b.style.display==='block'){
    var orders=loadJSON('sxs_purchase_orders'); var o=orders.find(function(x){ return x.id===oid; });
    if(o) sxsRenderOrderDetail(b, o);
  }
}
function sxsAiReviewAddOne(idx){
  var it=sxsAiRecItems[idx]; if(!it) return;
  var qel=document.getElementById('sxsrev_'+idx); if(qel){ it.qty=Math.max(0, parseFloat(qel.value)||0); }
  sxsAiPushToOrder(sxsAiRecOid, it);
  sxsAiRecItems.splice(idx,1);
  if(!sxsAiRecItems.length){ closeSxsAiRev(); sxsRefreshOrderDetail(sxsAiRecOid); sxsAiRecOid=''; toast('已添加到采购单 ✅'); return; }
  sxsShowAiReview();
  sxsRefreshOrderDetail(sxsAiRecOid);
}
function sxsAiReviewDrop(idx){
  sxsAiRecItems.splice(idx,1);
  if(!sxsAiRecItems.length){ closeSxsAiRev(); if(sxsAiRecOid) sxsRefreshOrderDetail(sxsAiRecOid); sxsAiRecOid=''; return; }
  sxsShowAiReview();
}
function sxsAiReviewConfirmAll(){
  sxsAiRecItems.forEach(function(it){ sxsAiPushToOrder(sxsAiRecOid, it); });
  sxsAiRecItems=[];
  closeSxsAiRev();
  sxsRefreshOrderDetail(sxsAiRecOid);
  sxsAiRecOid='';
  toast('已添加到采购单 ✅');
}

// ═══════════ 消息通知抽屉（全站通用，自动注入结构） ═══════════
// 菜谱页/我的页已有 notifDrawer 结构会跳过注入；其余页面首次点击铃铛时自动注入
function ensureNotifDrawer(){
  if(document.getElementById('notifDrawer')) return;
  var st=document.createElement('style');
  st.textContent='.drawer-mask{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:30;display:none;}.drawer-mask.show{display:block;}.drawer{position:fixed;top:50%;left:50%;width:92%;max-width:420px;background:#fff;border-radius:18px;z-index:31;max-height:82vh;display:flex;flex-direction:column;transform:translate(-50%,-50%) scale(.9);opacity:0;transition:transform .25s,opacity .25s;box-shadow:0 12px 40px rgba(0,0,0,.3);}.drawer-handle{width:36px;height:4px;background:rgba(0,0,0,.1);border-radius:2px;margin:10px auto 6px;flex-shrink:0;}.drawer-title{padding:0 18px 12px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;border-bottom:1px solid rgba(0,0,0,.08);}.drawer-title .dt-name{font-size:16px;font-weight:700;}.drawer-title .dt-close{font-size:22px;cursor:pointer;color:#777;}.drawer-body{overflow-y:auto;flex:1;padding:8px 0;}.notif-item{padding:12px 18px;border-bottom:1px solid rgba(0,0,0,.08);cursor:pointer;}.notif-item.unread{background:#EEEDFE;}.notif-item .ni-title{font-size:14px;font-weight:600;}.notif-item .ni-msg{font-size:14px;color:#555;margin-top:3px;}.notif-item .ni-time{font-size:14px;color:#777;margin-top:4px;}.drawer-footer{padding:10px 18px 16px;border-top:1px solid rgba(0,0,0,.08);flex-shrink:0;text-align:center;}.drawer-footer button{background:none;border:none;color:#777;font-size:14px;cursor:pointer;font-family:inherit;}.no-data{text-align:center;padding:30px 0;color:#777;font-size:14px;}';
  document.head.appendChild(st);
  var mask=document.createElement('div'); mask.id='notifMask'; mask.className='drawer-mask'; mask.setAttribute('onclick','closeNotifDrawer()');
  var box=document.createElement('div'); box.id='notifDrawer'; box.className='drawer';
  box.innerHTML='<div class="drawer-handle"></div><div class="drawer-title"><span class="dt-name">🔔 消息通知</span><span class="dt-close" onclick="closeNotifDrawer()">×</span></div><div class="drawer-body" id="notifList"></div><div class="drawer-footer"><button onclick="clearAllNotifications()">全部标为已读</button></div>';
  document.body.appendChild(mask); document.body.appendChild(box);
}
// 消息通知抽屉已停用（2026-07-11）：openNotifDrawer / closeNotifDrawer / renderNotifList / openNotifLink 均移除，改由业务入口红点提醒

// ═══════════ 采购单详情弹窗（全站通用，自动注入） ═══════════
function ensureOrderDetail(){
  if(document.getElementById('orderDetailMask')) return;
  var st=document.createElement('style');
  st.textContent='.od-mask{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:60;display:none;align-items:center;justify-content:center;}.od-mask.show{display:flex;}.od-box{background:#fff;width:92%;max-width:420px;border-radius:16px;max-height:82vh;display:flex;flex-direction:column;box-shadow:0 12px 40px rgba(0,0,0,.3);animation:odPop .2s;}.od-head{padding:14px 18px;border-bottom:1px solid rgba(0,0,0,.08);display:flex;justify-content:space-between;align-items:center;}.od-head .t{font-weight:700;font-size:16px;}.od-head .x{font-size:22px;cursor:pointer;color:#777;}.od-body{overflow-y:auto;padding:14px 18px;}.od-row{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #f0f0f0;font-size:15px;}.od-foot{font-size:13px;color:#777;margin-top:10px;}@keyframes odPop{from{transform:scale(.92);opacity:.6;}to{transform:scale(1);opacity:1;}}';
  document.head.appendChild(st);
  var mask=document.createElement('div'); mask.id='orderDetailMask'; mask.className='od-mask'; mask.setAttribute('onclick','closeOrderDetail()');
  var box=document.createElement('div'); box.className='od-box';
  box.innerHTML='<div class="od-head"><span class="t">📋 采购单详情</span><span class="x" onclick="closeOrderDetail()">×</span></div><div class="od-body" id="orderDetailBody"></div>';
  document.body.appendChild(mask); document.body.appendChild(box);
}
function openPurchaseDetail(orderId){
  ensureOrderDetail();
  var orders=loadJSON('sxs_purchase_orders');
  var o=orders.find(function(x){return x.id===orderId;});
  var body=document.getElementById('orderDetailBody');
  if(!o){ body.innerHTML='<div style="text-align:center;color:#777;padding:30px 0;">采购单不存在</div>'; }
  else {
    var stLabel = o.status==='pending_receive'?'待验收':(o.status==='received'?'已入库':(o.status==='rejected'?'已驳回':'审核中'));
    var h='<div style="margin-bottom:10px;">';
    h+='<div style="display:flex;justify-content:space-between;font-size:14px;color:#777;"><span>'+o.date+' '+(o.time||'')+'</span><span style="font-weight:700;color:var(--brand);">¥'+fmt0(o.total)+'</span></div>';
    h+='<div style="font-size:13px;color:#777;margin-top:3px;">采购人：'+(o.buyerName||'—')+' · 状态：'+stLabel+'</div>';
    h+='</div>';
    h+='<div style="border-top:1px solid rgba(0,0,0,.08);padding-top:6px;">';
    (o.items||[]).forEach(function(it){
      h+='<div class="od-row"><span>'+escapeHtml(it.name)+'</span><span>'+fmt0(it.qty)+(it.unit||'')+' × ¥'+fmt0(it.price||0)+'</span></div>';
    });
    h+='</div>';
    if(o.status==='received'){
      h+='<div class="od-foot">入库人：'+(o.receiverName||'—')+(o.receiveTime?' · '+o.receiveTime:'')+'</div>';
    }
    body.innerHTML=h;
  }
  document.getElementById('orderDetailMask').classList.add('show');
}
function closeOrderDetail(){ var m=document.getElementById('orderDetailMask'); if(m) m.classList.remove('show'); }

// ═══════════ 经营小助手（全局悬浮窗） ═══════════
(function initAiChat(){
  document.addEventListener('DOMContentLoaded', function(){ injectAiChat(); });
  // 如果DOM已加载则直接注入
  if(document.readyState==='interactive' || document.readyState==='complete'){
    setTimeout(injectAiChat, 300);
  }
})();

function injectAiChat(){
  if(document.getElementById('aiChatFab')) return;

  var style = document.createElement('style');
  style.textContent = `
.ai-fab { position:fixed; left:16px; bottom:25%; width:48px; height:48px; border-radius:50%;
  background:var(--brand,#534AB7); color:#fff; border:none; font-size:24px; cursor:grab;
  z-index:80; box-shadow:0 4px 16px rgba(83,74,183,.4); display:flex; align-items:center; justify-content:center;
  transition:transform .2s; touch-action:none; user-select:none; -webkit-user-select:none; }
.ai-fab.dragging { cursor:grabbing; opacity:.85; transition:none; }
.ai-fab:active { transform:scale(.9); }
.ai-panel { position:fixed; left:50%; top:50%; transform:translate(-50%,-50%); width:340px; max-width:90vw; height:auto; max-height:80vh;
  background:#fff; border-radius:16px; z-index:80; box-shadow:0 8px 32px rgba(0,0,0,.18);
  display:none; flex-direction:column; overflow:hidden; }
.ai-panel.show { display:flex; }
  .ai-panel-head { padding:12px 14px; background:var(--brand,#534AB7); color:#fff; display:flex; align-items:center; gap:8px; flex-shrink:0; }
  .ai-panel-head .ah-title { font-size:14px; font-weight:600; flex:1; }
  .ai-panel-head .ah-fmt { font-size:12px; padding:5px 10px; background:rgba(255,255,255,.18); color:#fff; border:1px solid rgba(255,255,255,.55); border-radius:10px; cursor:pointer; font-family:inherit; white-space:nowrap; }
  .ai-panel-head .ah-fmt:active { transform:scale(.96); }
  .ai-panel-head .ah-close { font-size:20px; cursor:pointer; background:none; border:none; color:#fff; }
.ai-panel-body { flex:1; overflow-y:auto; padding:14px; font-size:13px; }
  .ap-msglist { flex:1; overflow-y:auto; padding:6px 4px; min-height:120px; }
  .ap-msg { margin:8px 0; display:flex; }
  .ap-msg .bubble { max-width:82%; padding:9px 12px; border-radius:14px; font-size:13px; line-height:1.5; white-space:pre-wrap; word-break:break-word; }
  .ap-msg.user { justify-content:flex-end; }
  .ap-msg.user .bubble { background:var(--brand,#534AB7); color:#fff; border-bottom-right-radius:4px; }
  .ap-msg.bot { justify-content:flex-start; }
  .ap-msg.bot .bubble { background:#f2f1fb; color:#1a1a1a; border-bottom-left-radius:4px; }
  .ap-input { flex:1; min-width:0; width:auto; box-sizing:border-box; display:block; margin:0; border:1px solid #ddd; border-radius:12px; padding:10px 14px; font-size:13px; font-family:inherit; outline:none; resize:none; min-height:42px; max-height:120px; overflow-y:auto; line-height:1.5; flex-shrink:0; background:#fff; }
  .ap-input:focus { border-color:var(--brand,#534AB7); }
  .ap-send { width:auto; margin:0; padding:11px 14px; border:none; background:var(--brand,#534AB7); color:#fff; border-radius:12px; font-size:14px; font-weight:600; cursor:pointer; font-family:inherit; flex-shrink:0; }
  .ap-send:active { transform:scale(.96); }
  .ap-inputrow { display:flex; align-items:flex-end; gap:8px; padding:10px 12px; flex-shrink:0; }
  .ap-fmtmodal { position:fixed; inset:0; z-index:90; display:none; align-items:center; justify-content:center; background:rgba(0,0,0,.45); padding:16px; }
  .ap-fmtmodal.show { display:flex; }
  .ap-fmtcard { width:92%; max-width:380px; max-height:80vh; overflow-y:auto; background:#fff; border-radius:16px; padding:18px; box-shadow:0 8px 32px rgba(0,0,0,.25); font-size:13px; line-height:1.7; }
  .ap-fmtcard h4 { margin:0 0 10px; font-size:15px; color:var(--brand,#534AB7); }
  .ap-fmtcard .ex { color:var(--brand,#534AB7); font-weight:600; }
  .ap-fmtcard .close { margin-top:14px; width:100%; padding:11px; border:none; background:var(--brand,#534AB7); color:#fff; border-radius:12px; font-size:14px; font-weight:600; cursor:pointer; font-family:inherit; }
  .ap-fmtcard .fmt-head { display:flex; align-items:center; justify-content:space-between; margin:0 0 10px; }
  .ap-fmtcard .fmt-add { border:none; background:var(--brand,#534AB7); color:#fff; border-radius:10px; padding:6px 12px; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; }
  .ap-fmtcard .fmt-row { margin:10px 0; padding:10px 12px; background:#faf9ff; border-radius:10px; position:relative; }
  .ap-fmtcard .fmt-row .fmt-ops { position:absolute; top:8px; right:8px; display:flex; gap:6px; }
  .ap-fmtcard .fmt-op { border:none; background:#ede9ff; color:var(--brand,#534AB7); border-radius:8px; padding:3px 8px; font-size:12px; cursor:pointer; font-family:inherit; }
  .ap-fmtcard .fmt-op.del { background:#fde8e8; color:#e34; }
  .ap-fmtcard .fmt-editbox input { width:100%; box-sizing:border-box; margin:4px 0; padding:6px 8px; border:1px solid #ccc; border-radius:8px; font-family:inherit; font-size:13px; }
  .ap-fmtcard .fmt-editbtns { display:flex; gap:8px; margin-top:6px; }
  .ap-fmtcard .fmt-save { flex:1; border:none; background:var(--brand,#534AB7); color:#fff; border-radius:8px; padding:8px; font-weight:600; cursor:pointer; font-family:inherit; }
  .ap-fmtcard .fmt-cancel { flex:1; border:none; background:#eee; color:#555; border-radius:8px; padding:8px; cursor:pointer; font-family:inherit; }
  .ap-fmtcard .fmt-new { border:2px dashed var(--brand,#534AB7); background:#fff; color:var(--brand,#534AB7); text-align:center; }
  .ai-fab-toggle { display:inline-flex; align-items:center; gap:5px; font-size:12px; color:#fff; cursor:pointer; flex-shrink:0; user-select:none; }
  .ai-fab-toggle .sw { width:32px; height:18px; border-radius:9px; background:rgba(255,255,255,.32); position:relative; transition:background .2s; flex-shrink:0; }
  .ai-fab-toggle .sw::after { content:''; position:absolute; top:2px; left:2px; width:14px; height:14px; border-radius:50%; background:#fff; transition:left .2s; }
  .ai-fab-toggle.on .sw { background:#7CFFB0; }
  .ai-fab-toggle.on .sw::after { left:16px; }
  `;
  document.head.appendChild(style);

  var fab = document.createElement('button');
  fab.id = 'aiChatFab'; fab.className = 'ai-fab';
  fab.textContent = '💬';
  document.body.appendChild(fab);
  if(!sxsAiFabOn()) fab.style.display='none';

  // ── 拖拽逻辑 ──
  var dragData = { dragging:false, moved:false, sx:0, sy:0, fx:0, fy:0 };
  function dragStart(clientX, clientY){
    var rect = fab.getBoundingClientRect();
    dragData.dragging = true; dragData.moved = false;
    dragData.sx = clientX; dragData.sy = clientY;
    dragData.fx = rect.left; dragData.fy = rect.top;
    fab.classList.add('dragging');
  }
  function dragMove(clientX, clientY){
    if(!dragData.dragging) return;
    var dx = clientX - dragData.sx, dy = clientY - dragData.sy;
    if(Math.abs(dx)>4 || Math.abs(dy)>4) dragData.moved = true;
    var nx = dragData.fx + dx, ny = dragData.fy + dy;
    // 限制在视口内
    var w = fab.offsetWidth, h = fab.offsetHeight;
    nx = Math.max(4, Math.min(window.innerWidth - w - 4, nx));
    ny = Math.max(4, Math.min(window.innerHeight - h - 4, ny));
    fab.style.left = nx + 'px';
    fab.style.top = ny + 'px';
    fab.style.right = 'auto'; fab.style.bottom = 'auto';
  }
  function dragEnd(){
    if(!dragData.dragging) return;
    dragData.dragging = false;
    fab.classList.remove('dragging');
    // 没移动=点击，打开面板
    if(!dragData.moved) toggleAiPanel();
  }
  fab.addEventListener('mousedown', function(e){ e.preventDefault(); dragStart(e.clientX, e.clientY); });
  document.addEventListener('mousemove', function(e){ dragMove(e.clientX, e.clientY); });
  document.addEventListener('mouseup', dragEnd);
  fab.addEventListener('touchstart', function(e){ var t=e.touches[0]; dragStart(t.clientX, t.clientY); }, {passive:true});
  document.addEventListener('touchmove', function(e){ if(dragData.dragging){ var t=e.touches[0]; dragMove(t.clientX, t.clientY); e.preventDefault(); } }, {passive:false});
  document.addEventListener('touchend', dragEnd);

  var panel = document.createElement('div');
  panel.id = 'aiChatPanel'; panel.className = 'ai-panel';
  panel.innerHTML = `
    <div class="ai-panel-head">
      <span class="ah-title">🤖 录入助手</span>
      <button class="ah-fmt" id="apFmtBtnHead" type="button" onclick="apShowFmt()">📋 格式参考</button>
      <label class="ai-fab-toggle on" id="aiFabToggle" onclick="toggleAiFabFromPanel()"><span class="sw"></span><span>悬浮图标</span></label>
      <button class="ah-close" onclick="toggleAiPanel()">×</button>
    </div>
    <div class="ai-panel-body" id="aiChatBody" style="display:flex;flex-direction:column;flex:1;min-height:0;">
      <div class="ap-msglist" id="apMsgList" style="flex:1;overflow-y:auto;padding:6px 4px;"></div>
    </div>
    <div class="ap-inputrow">
      <button class="ap-send" id="apSendBtn">发送</button>
      <textarea class="ap-input" id="apInput" rows="1" placeholder="说一句就录入，如：买了五花肉5斤100块"></textarea>
    </div>
  `;
  document.body.appendChild(panel);

  // ── 格式参考弹窗（内容可编辑/新增，存 localStorage sxs_ai_fmt_ref）──
  var fmtModal = document.createElement('div');
  fmtModal.id = 'apFmtModal'; fmtModal.className = 'ap-fmtmodal';
  fmtModal.innerHTML = ''
    + '<div class="ap-fmtcard">'
    + '<div class="fmt-head"><h4 style="margin:0;">📋 录入格式参考</h4><button class="fmt-add" id="apFmtAddBtn" type="button" onclick="apFmtAddNew()">＋ 新增格式</button></div>'
    + '<div id="apFmtRows"></div>'
    + '<button class="close" onclick="apHideFmt()">知道了</button>'
    + '</div>';
  fmtModal.addEventListener('click', function(e){ if(e.target===fmtModal) apHideFmt(); });
  document.body.appendChild(fmtModal);

  // ── 发送绑定（apSend 为函数声明，已提升可用）──
  var apSendBtn = document.getElementById('apSendBtn');
  if(apSendBtn) apSendBtn.onclick = apSend;
  var apInputEl = document.getElementById('apInput');
  if(apInputEl){
    // 换行就是换行：不拦截 Enter，发送只通过点击按钮；输入时自适应高度
    apInputEl.addEventListener('input', function(){ apAutoGrow(); });
  }
}

// ── AI助手悬浮图标 开关（sxs_ai_fab_enabled，默认开启）──
function sxsAiFabOn(){ var v=localStorage.getItem('sxs_ai_fab_enabled'); return v!=='0'; }
function setAiFabEnabled(on){
  localStorage.setItem('sxs_ai_fab_enabled', on?'1':'0');
  var fab=document.getElementById('aiChatFab');
  if(fab) fab.style.display = on?'flex':'none';
}
function toggleAiFabEnabled(el){
  var on = el ? !!el.checked : !sxsAiFabOn();
  setAiFabEnabled(on);
  toast(on?'AI助手悬浮图标已开启':'AI助手悬浮图标已关闭', true);
}
// 录入助手弹窗标题旁的开关：关闭/开启悬浮图标
function toggleAiFabFromPanel(){
  var on = sxsAiFabOn();
  setAiFabEnabled(!on);
  var t=document.getElementById('aiFabToggle'); if(t) t.classList.toggle('on', !on);
  toast(!on?'AI助手悬浮图标已关闭':'AI助手悬浮图标已开启', true);
}
function toggleAiPanel(){
  var panel = document.getElementById('aiChatPanel');
  var fab = document.getElementById('aiChatFab');
  if(!panel || !fab) return;
  if(panel.classList.contains('show')){
    panel.classList.remove('show');
  } else {
    var inp = document.getElementById('apInput');
    if(inp){ inp.value=''; inp.style.height='auto'; setTimeout(function(){ try{ inp.focus(); }catch(e){} }, 60); }
    panel.classList.add('show');
    // 同步悬浮图标开关状态
    var t=document.getElementById('aiFabToggle'); if(t) t.classList.toggle('on', sxsAiFabOn());
  }
}
function apShowFmt(){ apRenderFmtRows(); var m=document.getElementById('apFmtModal'); if(m) m.classList.add('show'); }
function apHideFmt(){ var m=document.getElementById('apFmtModal'); if(m) m.classList.remove('show'); }

// ── 格式参考：可编辑 / 新增（存 localStorage sxs_ai_fmt_ref）──
var AP_FMT_DEF = [
  {t:'① 改库存（设为绝对数量）', ex:'五花肉剩3斤了', kw:'触发词：剩/还有/余/库存 + 数量'},
  {t:'② 采购录入', ex:'买了五花肉5斤100块', kw:'触发词：买/进/采购/拿/上货/收货 + 商品 + 数量 + 金额'},
  {t:'③ 营收', ex:'今天营业额4800 或 今天卖了480', kw:'触发词：卖/营业额/营收/收钱/收入'},
  {t:'④ 支出', ex:'付了电费850', kw:'触发词：付/花/支/缴/交/费 + 金额（自动识别电费/水费/房租等）'},
  {t:'⑤ 收货记采购', ex:'收到五花肉5斤', kw:'含“收/收货”会记成采购而非营收'}
];
function apGetFmtRef(){
  try{ var s=localStorage.getItem('sxs_ai_fmt_ref'); if(s){ var a=JSON.parse(s); if(Array.isArray(a)&&a.length) return a; } }catch(e){}
  return JSON.parse(JSON.stringify(AP_FMT_DEF));
}
function apSaveFmtRef(a){ try{ localStorage.setItem('sxs_ai_fmt_ref', JSON.stringify(a)); }catch(e){} }
function apCanEditFmt(){
  try{ var u=getCurrentUser(); if(!u) return false; var r=u.role||'';
    if(r==='boss'||r==='admin'||r.indexOf('admin')>=0||r.indexOf('管理')>=0) return true;
  }catch(e){}
  return false;
}
var apFmtEditing = -1; // 正在编辑的下标；-1=无；'new'=新增行
function apRenderFmtRows(){
  var rows=apGetFmtRef();
  var canEdit=apCanEditFmt();
  var box=document.getElementById('apFmtRows'); if(!box) return;
  if(apFmtEditing==='new'){
    box.innerHTML = apFmtEditHTML(-1, {t:'',ex:'',kw:''}, true);
  } else {
    var h='';
    rows.forEach(function(it, i){
      if(apFmtEditing===i){ h += apFmtEditHTML(i, it, false); }
      else {
        h += '<div class="fmt-row"><b>'+_sxsEsc(it.t||'')+'</b><br>例：<span class="ex">'+(it.ex||'')+'</span>';
        if(it.kw){ h += '<br><span style="color:#888;">'+(it.kw||'')+'</span>'; }
        if(canEdit){ h += '<div class="fmt-ops"><button class="fmt-op" onclick="apFmtEdit('+i+')">✏️ 编辑</button><button class="fmt-op del" onclick="apFmtDel('+i+')">🗑 删除</button></div>'; }
        h += '</div>';
      }
    });
    box.innerHTML = h;
  }
  var addBtn=document.getElementById('apFmtAddBtn');
  if(addBtn) addBtn.style.display = canEdit ? 'inline-block' : 'none';
}
function apFmtEditHTML(i, it, isNew){
  return '<div class="fmt-row fmt-editbox">'
    + '<input id="apFmtT" placeholder="标题，如：① 改库存" value="'+_sxsEsc(it.t||'')+'">'
    + '<input id="apFmtEx" placeholder="示例，如：五花肉剩3斤了" value="'+_sxsEsc(it.ex||'')+'">'
    + '<input id="apFmtKw" placeholder="触发词说明，如：触发词：剩/还有" value="'+_sxsEsc(it.kw||'')+'">'
    + '<div class="fmt-editbtns">'
    + '<button class="fmt-save" onclick="apFmtSave('+(isNew?1:0)+','+i+')">💾 保存</button>'
    + '<button class="fmt-cancel" onclick="apFmtCancel()">取消</button>'
    + '</div></div>';
}
function apFmtEdit(i){ apFmtEditing=i; apRenderFmtRows(); }
function apFmtCancel(){ apFmtEditing=-1; apRenderFmtRows(); }
function apFmtAddNew(){ apFmtEditing='new'; apRenderFmtRows(); }
function apFmtSave(isNew, i){
  var t=document.getElementById('apFmtT'); var ex=document.getElementById('apFmtEx'); var kw=document.getElementById('apFmtKw');
  var title=t?t.value.trim():''; var example=ex?ex.value.trim():''; var kwv=kw?kw.value.trim():'';
  if(!title && !example){ toast('标题和示例不能都为空'); return; }
  var rows=apGetFmtRef();
  if(isNew){ rows.push({t:title, ex:example, kw:kwv}); }
  else { if(rows[i]){ rows[i]={t:title, ex:example, kw:kwv}; } }
  apSaveFmtRef(rows);
  apFmtEditing=-1;
  apRenderFmtRows();
  toast('已保存','✅');
}
function apFmtDel(i){
  if(!confirm('确定删除这条格式参考？')) return;
  var rows=apGetFmtRef();
  if(i>=0 && i<rows.length) rows.splice(i,1);
  apSaveFmtRef(rows);
  apFmtEditing=-1;
  apRenderFmtRows();
  toast('已删除','✅');
}

// 输入框随内容自适应高度（最多约5行，超出滚动）
function apAutoGrow(){
  var el = document.getElementById('apInput');
  if(!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

// ═══════════ 对话录入引擎（本地规则，真实写入） ═══════════
function apGetProds(){ try{ return JSON.parse(localStorage.getItem('sp_prods')||'[]'); }catch(e){ return []; } }
function apSaveProds(a){ try{ localStorage.setItem('sp_prods', JSON.stringify(a)); }catch(e){} }
function apGetKucun(){ try{ return JSON.parse(localStorage.getItem('sxs_kucun')||'{}'); }catch(e){ return {}; } }
function apSaveKucun(o){ try{ localStorage.setItem('sxs_kucun', JSON.stringify(o)); }catch(e){} }
function apGetJizhang(){ try{ return JSON.parse(localStorage.getItem('sxs_jizhang')||'[]'); }catch(e){ return []; } }
function apSaveJizhang(a){ try{ localStorage.setItem('sxs_jizhang', JSON.stringify(a)); }catch(e){} }
function apGetPurchaseRecords(){ try{ return JSON.parse(localStorage.getItem('sxs_purchase_records')||'[]'); }catch(e){ return []; } }
function apSavePurchaseRecords(a){ try{ localStorage.setItem('sxs_purchase_records', JSON.stringify(a.slice(0,200))); }catch(e){} }

// 在商品库里找最匹配的商品（最长名称优先）
function apFindProd(name){
  var prods = apGetProds(); var hit = null;
  prods.forEach(function(p){
    if(!p || !p.name) return;
    if(name.indexOf(p.name) >= 0 || p.name.indexOf(name) >= 0){
      if(!hit || p.name.length > hit.name.length) hit = p;
    }
  });
  return hit;
}
function apFindProdById(id){
  var prods = apGetProds();
  for(var i=0;i<prods.length;i++){ if(prods[i] && prods[i].id===id) return prods[i]; }
  return null;
}

// 提取数量+单位：如 "5斤" -> {qty:5, unit:'斤'}
function apExtractQty(text){
  var m = text.match(/(\d+(?:\.\d+)?)\s*(斤|千克|公斤|kg|克|g|个|只|根|条|包|瓶|袋|盒|升|l|份|块|粒|把)/i);
  if(m){
    var u = m[2].toLowerCase();
    var unit = u==='kg' ? '千克' : (u==='g' ? '克' : (u==='l' ? '升' : m[2]));
    return { qty: parseFloat(m[1]), unit: unit };
  }
  return null;
}
// 提取金额：优先带货币单位，否则取句末数字
function apExtractMoney(text){
  var m = text.match(/(?:¥|￥)\s*(\d+(?:\.\d+)?)/);
  if(m) return parseFloat(m[1]);
  m = text.match(/(\d+(?:\.\d+)?)\s*(?:元|块|块钱)/);
  if(m) return parseFloat(m[1]);
  var all = text.match(/\d+(?:\.\d+)?/g);
  if(all && all.length) return parseFloat(all[all.length-1]);
  return null;
}
function qtyOf(q){ return q && q.qty ? q.qty : 0; }

// 更新某商品库存（同时维护 sp_prods.qty 与 sxs_kucun，与库存页共享）
function apUpdateStock(prod, qty, isAbsolute){
  var prods = apGetProds();
  var kc = apGetKucun();
  var cur = 0;
  if(kc[prod.id] !== undefined) cur = Number(kc[prod.id]);
  else if(prod.qty) cur = Number(prod.qty);
  var newQty = isAbsolute ? qty : (cur + qty);
  prods.forEach(function(p){ if(p.id===prod.id){ p.qty = newQty; } });
  apSaveProds(prods);
  kc[prod.id] = newQty;
  apSaveKucun(kc);
  return newQty;
}

// 主解析：返回回复文案
var apLastUndo = null;   // 最近一次 AI 录入的可撤销信息（记错时点“撤销”回滚）
function apParse(text){
  if(!text || !text.trim()) return '说点什么吧～';
  var t = text.trim();

  // ① 改库存：剩/还有/余/库存 + 商品 + 数量
  if(/(剩|还有|余|库存)/.test(t) && /(\d+(?:\.\d+)?)/.test(t)){
    var q1 = apExtractQty(t) || (function(){ var dm=t.match(/(\d+(?:\.\d+)?)/); return dm?{qty:parseFloat(dm[1]),unit:''}:null; })();
    var prod1 = apFindProd(t);
    if(q1 && prod1){
      var before1 = (function(){ var k=apGetKucun(); return (k[prod1.id]!==undefined)?Number(k[prod1.id]):Number(prod1.qty||0); })();
      var nq = apUpdateStock(prod1, q1.qty, true);
      apLastUndo = { type:'stock', prodId:prod1.id, oldQty:before1 };
      return '✅ '+prod1.name+' 库存已更新为 '+nq+q1.unit+'（'+todayStr()+'）';
    }
    var nm = (t.replace(/[^一-龥a-zA-Z]/g,'')||'').slice(0,6);
    return '😅 没找到「'+nm+'」这个商品，先去商品库添加一下吧';
  }

  // ①出库：出库/领用/领料 + 商品 + 数量 → 库存扣减（放在采购之前，避免被误判）
  if(/(出库|领用|领料|领出|领走)/.test(t)){
    var q0 = apExtractQty(t);
    var prod0 = apFindProd(t);
    if(!q0 && !prod0) return '😅 没听清商品和数量，试着说：出库 五花肉 6斤';
    if(!prod0) return '😅 没在商品库找到「'+((t.replace(/[^一-龥]/g,'')||'').slice(0,6))+'」，先去商品库加一下再试';
    var outQty0 = q0 ? q0.qty : 1;
    var kc0 = apGetKucun();
    var cur0 = (kc0[prod0.id]!==undefined) ? Number(kc0[prod0.id]) : Number(prod0.qty||0);
    if(cur0 < outQty0) return '😅 '+prod0.name+' 库存不足（剩 '+cur0+(prod0.unit||'')+'），无法出库';
    apUpdateStock(prod0, -outQty0, false);   // 扣减库存
    var rec0 = { id:'out_'+Date.now(), date:todayStr(), time:nowTimeStr(), items:[{productId:prod0.id,name:prod0.name,unit:prod0.unit||'',qty:outQty0}], purpose:'AI对话出库', receiver:'', userName:(getCurrentUser()||{}).name||'AI', single:false };
    var recs0 = loadJSON('sxs_out_records')||[]; recs0.unshift(rec0); if(recs0.length>200) recs0=recs0.slice(0,200); saveJSON('sxs_out_records', recs0);
    var _u0 = loadJSON('sxs_out_usage')||{}; _u0[prod0.id]=(Number(_u0[prod0.id])||0)+outQty0; saveJSON('sxs_out_usage', _u0);
    if(typeof addLog==='function'){ try{ addLog('kucun_out','AI对话出库 '+prod0.name+' '+outQty0+(prod0.unit||''),'kucun'); }catch(e){} }
    apLastUndo = { type:'out', id:rec0.id, prodId:prod0.id, qty:outQty0 };
    return '✅ 已出库：'+prod0.name+' '+outQty0+(prod0.unit||'')+'，库存剩 '+(cur0-outQty0)+(prod0.unit||'');
  }

  // ② 采购：买/进/采购/拿/上货 + 商品 + 数量 + 金额
  if(/(买|进|采购|拿|上货|收了货|收货|收到)/.test(t) || (/收/.test(t) && apFindProd(t))){
    var q2 = apExtractQty(t);
    var remainT = t.replace(/(\d+(?:\.\d+)?)\s*(斤|千克|公斤|kg|克|g|个|只|根|条|包|瓶|袋|盒|升|l|份|块|粒|把)/i, '');
    var m2 = apExtractMoney(remainT);
    var prod2 = apFindProd(t);
    if(!q2 && m2===null){ return '😅 没听清数量或金额，试着说：买了五花肉5斤100块'; }
    if(prod2){
      var unit2 = q2 ? q2.unit : (prod2.unit||'');
      var addQty = q2 ? q2.qty : 0;
      var newQty2 = apUpdateStock(prod2, addQty, false);
      if(m2!==null){
        var prods2 = apGetProds();
        prods2.forEach(function(p){ if(p.id===prod2.id && addQty>0){ p.lastPrice = +(m2/addQty).toFixed(2); } });
        apSaveProds(prods2);
      }
      var _aiId2 = 'ai_'+Date.now();
      var rec = apGetPurchaseRecords();
      rec.unshift({ _aiId:_aiId2, name: prod2.name, qty: addQty, unit: unit2, amount: m2||0, date: todayStr() });
      apSavePurchaseRecords(rec);
      apLastUndo = { type:'purchase', id:_aiId2, prodId:prod2.id, qty:addQty };
      return '✅ 已记采购：'+prod2.name+' '+addQty+unit2+(m2!==null?('，支出 ¥'+m2):'')+'，库存更新为 '+newQty2+unit2;
    }
    return '😅 没在商品库找到对应商品，先去采购页加一下再试';
  }

  // ③ 营收：卖/收(钱)/营业额/营业/生意
  if(/(卖|营业额|营收|营业|生意|做了|收钱|收款|收入)/.test(t)){
    var m3 = apExtractMoney(t);
    if(m3!==null){
      var _aiId3 = 'ai_'+Date.now();
      var jz = apGetJizhang();
      jz.push({ _aiId:_aiId3, type:'income', amount: m3, note:'对话录入营收', date: todayStr() });
      apSaveJizhang(jz);
      apLastUndo = { type:'jizhang', id:_aiId3 };
      return '✅ 已记营收：¥'+m3+'（'+todayStr()+'）';
    }
    return '😅 没听清金额，试着说：今天卖了480';
  }

  // ④ 支出：付/花了/花费/花销/支/缴/交/费 + 金额（"花"需带语境，避免"五花肉"误命中）
  if(/(付|花了|花费|花销|支|缴|交|费)/.test(t)){
    var m4 = apExtractMoney(t);
    if(m4!==null){
      var fee = (t.replace(/[^一-龥]/g,'').match(/(电费|水费|房租|工资|油费|燃气费|物业费|话费|宽带费|材料费|维修费|罚款|税费|货款|餐费|运费)/)||[])[0] || '其他支出';
      var _aiId4 = 'ai_'+Date.now();
      var jz2 = apGetJizhang();
      jz2.push({ _aiId:_aiId4, type:'expense', amount: m4, note: fee, date: todayStr() });
      apSaveJizhang(jz2);
      apLastUndo = { type:'jizhang', id:_aiId4 };
      return '✅ 已记支出：'+fee+' ¥'+m4+'（'+todayStr()+'）';
    }
    return '😅 没听清金额，试着说：付了电费850';
  }

  return '😅 没太听懂。你可以试着说：\n• 买了五花肉5斤100块\n• 付了电费850\n• 今天卖了480\n• 五花肉剩3斤了';
}

// 对话 UI
function apAppend(role, text){
  var list = document.getElementById('apMsgList');
  if(!list) return;
  var msg = document.createElement('div');
  msg.className = 'ap-msg ' + (role==='user' ? 'user' : 'bot');
  var bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;
  msg.appendChild(bubble);
  list.appendChild(msg);
  list.scrollTop = list.scrollHeight;
}
function apSend(){
  var inp = document.getElementById('apInput');
  if(!inp) return;
  var text = inp.value.trim();
  if(!text) return;
  apAppend('user', text);
  inp.value = '';
  var reply = '';
  try { reply = apParse(text); } catch(e){ reply = '⚠️ 处理出错了：'+e.message; }
  setTimeout(function(){ apAppend('bot', reply); apRenderUndo(); }, 150);
}
// 录入成功后，若可撤销，在对话里加一个“✕撤销”按钮
function apRenderUndo(){
  if(!apLastUndo) return;
  var list = document.getElementById('apMsgList'); if(!list) return;
  var ub = document.createElement('div');
  ub.style.cssText = 'text-align:right;padding:0 4px 8px;';
  var btn = document.createElement('button');
  btn.textContent = '✕ 撤销上一步';
  btn.title = '记错了？点此撤回刚才的录入';
  btn.style.cssText = 'font-size:12px;color:#c0392b;border:1px solid #f0c0bb;background:#fff;border-radius:10px;padding:3px 10px;cursor:pointer;font-family:inherit;';
  btn.onclick = apUndo;
  ub.appendChild(btn);
  list.appendChild(ub);
  list.scrollTop = list.scrollHeight;
}
// 撤销最近一次 AI 录入（记错时的补救）
function apUndo(){
  if(!apLastUndo){ toast('没有可撤销的录入'); return; }
  var u = apLastUndo; apLastUndo = null;
  if(u.type==='jizhang'){
    var jz = apGetJizhang(); jz = jz.filter(function(x){ return x._aiId!==u.id; }); apSaveJizhang(jz);
    toast('已撤销该记账记录','✅');
  } else if(u.type==='purchase'){
    var recs = apGetPurchaseRecords(); recs = recs.filter(function(x){ return x._aiId!==u.id; }); apSavePurchaseRecords(recs);
    if(u.prodId){ var p = apFindProdById(u.prodId); if(p) apUpdateStock(p, -u.qty, false); }
    toast('已撤销采购录入（库存已回滚）','✅');
  } else if(u.type==='out'){
    var ors = loadJSON('sxs_out_records')||[]; ors = ors.filter(function(x){ return x.id!==u.id; }); saveJSON('sxs_out_records', ors);
    if(u.prodId){ var p2 = apFindProdById(u.prodId); if(p2) apUpdateStock(p2, u.qty, false); }
    toast('已撤销出库（库存已回滚）','✅');
  } else if(u.type==='stock'){
    var pk = apFindProdById(u.prodId); if(pk) apUpdateStock(pk, u.oldQty, true);
    toast('已撤销库存修改','✅');
  }
  // 刷新可能受影响的页面列表
  if(typeof renderOutRecords==='function'){ try{ renderOutRecords(); }catch(e){} }
  if(typeof renderStockAlerts==='function'){ try{ renderStockAlerts(); }catch(e){} }
}


// ═══════════ 图标库 ═══════════
var SXS_ICONS = [
  // 主食/热菜
  '🍚','🍛','🍜','🍝','🍲','🍳','🥘','🥟','🫕','🍕','🥪','🌯','🌮','🍔','🌭','🥓','🍖','🍗','🥩',
  // 小吃/凉菜
  '🥗','🥒','🥬','🌽','🥕','🧅','🧄','🥔','🍠','🥜','🫘',
  // 汤/饮品
  '🍵','☕','🧋','🥤','🧃','🍶','🥛','🧊',
  // 甜点/水果
  '🍰','🧁','🥮','🍦','🍨','🍩','🍪','🍭','🍫','🍉','🍎','🍊','🍋','🍌','🍇','🍓','🫐','🥭',
  // 套餐/盒饭
  '🍱','🥡','🧆','🥮',
  // 调味/配料
  '🧂','🫑','🌶️','🥫','🫒',
  // 海鲜
  '🐟','🐠','🦐','🦀','🐙','🦪','🐚',
  // 肉类
  '🐷','🐮','🐔','🐑','🦆','🐇','🥚',
  // 其他
  '🥢','🍴','🥄','🍽️','🧊','🔥','💧','🧩','🧊'
];

// 图标选择器弹窗（唯一实例，避免重复创建）
var iconPickerEl = null;
function showIconPicker(targetId){
  var input = document.getElementById(targetId);
  if(!input) return;
  if(iconPickerEl && iconPickerEl.parentNode) iconPickerEl.parentNode.removeChild(iconPickerEl);
  iconPickerEl = document.createElement('div');
  iconPickerEl.id = 'sxsIconPicker';
  iconPickerEl.style.cssText = 'position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45);';
  var box = document.createElement('div');
  box.style.cssText = 'background:#fff;border-radius:16px;width:320px;max-width:88vw;max-height:70vh;display:flex;flex-direction:column;overflow:hidden;';
  box.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px 10px;border-bottom:1px solid #eee;">'+
    '<span style="font-size:16px;font-weight:600;">选择图标</span>'+
    '<span id="iconPickerClose" style="font-size:22px;cursor:pointer;color:#999;">×</span></div>'+
    '<div id="iconPickerGrid" style="flex:1;overflow-y:auto;padding:12px;display:grid;grid-template-columns:repeat(6,1fr);gap:4px;"></div>';
  iconPickerEl.appendChild(box);
  document.body.appendChild(iconPickerEl);

  var grid = document.getElementById('iconPickerGrid');
  SXS_ICONS.forEach(function(ic){
    var el = document.createElement('div');
    el.style.cssText = 'padding:8px 4px;cursor:pointer;border-radius:10px;text-align:center;font-size:26px;transition:background .1s;';
    el.textContent = ic;
    el.onmouseover = function(){ el.style.background = '#f0f0f0'; };
    el.onmouseout = function(){ el.style.background = ''; };
    el.onclick = function(){
      input.value = ic;
      input.style.borderColor = '#534AB7';
      input.style.background = '#EEEDFE';
      // 触发input事件，让监听器响应
      var evt = document.createEvent('Event');
      evt.initEvent('input', true, true);
      input.dispatchEvent(evt);
      var evt2 = document.createEvent('Event');
      evt2.initEvent('change', true, true);
      input.dispatchEvent(evt2);
      dismissIconPicker();
    };
    grid.appendChild(el);
  });

  document.getElementById('iconPickerClose').onclick = dismissIconPicker;
  iconPickerEl.onclick = function(e){ if(e.target === iconPickerEl) dismissIconPicker(); };
}

function dismissIconPicker(){
  if(iconPickerEl && iconPickerEl.parentNode) iconPickerEl.parentNode.removeChild(iconPickerEl);
  iconPickerEl = null;
}

// ── 自动填充版本号到页面槽位（含 id="appVer" 的页面，如"我的"页）──
(function(){
  var _av = document.getElementById('appVer');
  if(_av) _av.textContent = 'v' + (window.APP_VERSION || '?');
})();
