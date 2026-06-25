// SalesOps Pro — Supabase Sync FINAL v4.0
// Alphatec Trading OPC

const SUPABASE_URL = 'https://dbmlmwpjvrcnzbyzsyrl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRibWxtd3BqdnJjbnpieXpzeXJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNTg3MTQsImV4cCI6MjA5NzkzNDcxNH0.vez8xEuNIgm3Flkix2fBXy1Q6nQamu0YJG6w4Ttr9sk';

// ── INIT ──────────────────────────────────────────────────
window._sbDb = null;
try {
  if (typeof supabase !== 'undefined' && supabase.createClient) {
    window._sbDb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('[SB] Connected ✓');
  }
} catch(e) { console.error('[SB] Init error:', e.message); }

// ── TOAST ─────────────────────────────────────────────────
window.sbToast = function(msg, color) {
  try {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;background:'+(color||'#1e40af')+';color:#fff;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600;opacity:0;transition:opacity 0.3s;box-shadow:0 4px 12px rgba(0,0,0,.2)';
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.style.opacity = '1');
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 3000);
  } catch(e) {}
};

// ── LOADER (navy + gold) ──────────────────────────────────
window.sbShowLoader = function(msg) {
  try {
    let el = document.getElementById('sbLoader');
    if (!el) {
      el = document.createElement('div');
      el.id = 'sbLoader';
      el.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.88);z-index:99998;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px';
      el.innerHTML = '<div style="width:52px;height:52px;border:4px solid rgba(255,255,255,0.15);border-top-color:#d97706;border-radius:50%;animation:sbSpin 0.8s linear infinite"></div><div style="color:#fff;font-size:15px;font-weight:600" id="sbLoaderMsg">Loading...</div><div style="color:#d97706;font-size:12px;letter-spacing:.5px">SalesOps Pro · Alphatec Trading OPC</div><style>@keyframes sbSpin{to{transform:rotate(360deg)}}</style>';
      document.body.appendChild(el);
    }
    const m = document.getElementById('sbLoaderMsg');
    if (m) m.textContent = msg || 'Loading...';
    el.style.display = 'flex';
  } catch(e) {}
};

window.sbHideLoader = function() {
  try {
    const el = document.getElementById('sbLoader');
    if (el) el.style.display = 'none';
  } catch(e) {}
};

// ── SAVE ──────────────────────────────────────────────────
window.sbSave = async function(table, row) {
  if (!window._sbDb) { window.sbToast('⚠️ Not connected', '#dc2626'); return false; }
  try {
    const { error } = await window._sbDb.from(table).upsert(row, { onConflict: 'id' });
    if (error) { window.sbToast('⚠️ ' + error.message, '#dc2626'); console.error('[SB] Save error on', table, error); return false; }
    window.sbToast('💾 Saved!', '#1e40af');
    return true;
  } catch(e) { window.sbToast('⚠️ ' + e.message, '#dc2626'); return false; }
};

// ── LOAD ALL — directly replaces app arrays ───────────────
window.sbLoadAll = async function() {
  if (!window._sbDb) { console.warn('[SB] Not connected'); return false; }
  window.sbShowLoader('Loading data from cloud...');
  let loaded = 0;

  try {
    // Helper: fetch table and replace app array in-place
    const loadInto = async (table, appArr, mapFn) => {
      try {
        const { data, error } = await window._sbDb.from(table).select('*').order('id');
        if (error) { console.warn('[SB]', table, error.message); return; }
        if (data && data.length > 0) {
          // Clear and refill the SAME array reference
          appArr.splice(0, appArr.length);
          data.map(mapFn).forEach(r => appArr.push(r));
          loaded++;
          console.log('[SB] ✓', table, data.length, 'rows');
        }
      } catch(e) { console.warn('[SB] Skip', table, e.message); }
    };

    // Load each table into the app's live arrays
    if (typeof catalog     !== 'undefined') await loadInto('products',     catalog,     r=>({id:r.id,code:r.code,desc:r.desc||r.description||'',type:r.type||'Product',unit:r.unit||'pcs',group:r.group||'',sp:+r.selling_price||0,pc:+r.unit_cost||0,qtyIn:+r.qty_in||0,qtyOrd:+r.qty_ord||0,qtyAlloc:+r.qty_alloc||0,reorder:+r.reorder||0}));
    if (typeof leads       !== 'undefined') await loadInto('leads',        leads,        r=>({id:r.id,name:r.name,company:r.company||'',stage:r.stage||'New Lead',value:+r.value||0,owner:r.owner||'',lastContact:r.last_contact||'',nextAction:r.next_action||'',status:r.status||'Active'}));
    if (typeof clientPOs   !== 'undefined') await loadInto('client_pos',   clientPOs,    r=>({id:r.id,num:r.po_number,client:r.client_name,date:r.date||'',status:r.status||'',terms:r.terms||'',prodTotal:+r.prod_total||0,svcTotal:+r.svc_total||0,total:+r.total_amount||0}));
    if (typeof supplierPOs !== 'undefined') await loadInto('supplier_pos', supplierPOs,  r=>({id:r.id,num:r.po_number,supplier:r.supplier_name,linked:r.linked_cpo||'',date:r.date||'',delivery:r.delivery||'',status:r.status||'',lines:[{type:'product'}],total:+r.total_amount||0,paid:+r.paid||0,balance:+r.balance||0}));
    if (typeof invoices    !== 'undefined') await loadInto('invoices',     invoices,     r=>({id:r.id,num:r.invoice_number,poRef:r.po_ref||'',client:r.client_name,date:r.date||'',due:r.due_date||'',terms:r.terms||'',amount:+r.total_amount||0,paid:+r.amount_paid||0,balance:(+r.total_amount||0)-(+r.amount_paid||0),status:r.status||''}));
    if (typeof expenses    !== 'undefined') await loadInto('expenses',     expenses,     r=>({id:r.id,ref:r.ref,date:r.date||'',month:r.month||'',cat:r.category||'',desc:r.description||'',payee:r.payee||'',amount:+r.amount||0,mode:r.payment_mode||'',status:r.status||'Pending'}));

    // Rebuild derived arrays from loaded data
    if (typeof invoices !== 'undefined' && typeof arRecords !== 'undefined') {
      arRecords.splice(0, arRecords.length);
      invoices.forEach((v,i) => arRecords.push({id:i+1,ref:'AR-'+(i+1).toString().padStart(6,'0'),invNum:v.num,client:v.client,invDate:v.date,dueDate:v.due,amount:v.amount,paid:v.paid,balance:v.balance,status:v.balance===0?'Paid':v.status==='Overdue'?'Overdue':v.paid>0?'Partially Paid':'Outstanding'}));
    }
    if (typeof supplierPOs !== 'undefined' && typeof apRecords !== 'undefined') {
      apRecords.splice(0, apRecords.length);
      supplierPOs.forEach((v,i) => apRecords.push({id:i+1,ref:'AP-'+(i+1).toString().padStart(6,'0'),spoNum:v.num,supplier:v.supplier,billDate:v.date,dueDate:v.date,amount:v.total,paid:v.paid,balance:v.balance,status:v.balance===0?'Paid':v.paid>0?'Partially Paid':'Outstanding'}));
    }

    // Update ID counters so new entries don't clash
    if (typeof leads       !== 'undefined' && leads.length)       window.idL = Math.max(...leads.map(r=>r.id)) + 1;
    if (typeof clientPOs   !== 'undefined' && clientPOs.length)   window.idC = Math.max(...clientPOs.map(r=>r.id)) + 1;
    if (typeof supplierPOs !== 'undefined' && supplierPOs.length) window.idS = Math.max(...supplierPOs.map(r=>r.id)) + 1;
    if (typeof invoices    !== 'undefined' && invoices.length)    window.idI = Math.max(...invoices.map(r=>r.id)) + 1;
    if (typeof expenses    !== 'undefined' && expenses.length)    window.expId = Math.max(...expenses.map(r=>r.id)) + 1;

    window.sbHideLoader();

    if (loaded > 0) {
      window.sbToast('☁️ Loaded ' + loaded + ' tables from cloud', '#1e40af');
      // Refresh all UI components
      setTimeout(() => {
        try { if(typeof refreshDash==='function') refreshDash(); } catch(e){}
        try { if(typeof renderCatalog==='function') renderCatalog(); } catch(e){}
        try { if(typeof updateBadges==='function') updateBadges(); } catch(e){}
        try { if(typeof updateNumPreviews==='function') updateNumPreviews(); } catch(e){}
        try { if(typeof buildMonthSel==='function') buildMonthSel(); } catch(e){}
        console.log('[SB] ✓ UI fully refreshed from Supabase');
      }, 100);
    } else {
      console.log('[SB] No data in Supabase yet — app ready for first entry');
      try { if(typeof refreshDash==='function') refreshDash(); } catch(e){}
    }
    return true;
  } catch(e) {
    window.sbHideLoader();
    console.error('[SB] Load failed:', e.message);
    try { if(typeof refreshDash==='function') refreshDash(); } catch(e2){}
    return false;
  }
};

// ── PRINT FIX ─────────────────────────────────────────────
window.closePrintDoc = function() {
  const w = document.getElementById('printDocWrap');
  if (w) w.style.display = 'none';
};

window._salesopsPatchApplied = true;
console.log('[SB] supabase_sync.js FINAL v4.0 loaded ✓');
