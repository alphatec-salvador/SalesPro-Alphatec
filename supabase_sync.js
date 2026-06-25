// SalesOps Pro — Supabase Sync + Boot Fix v3.0
// Alphatec Trading OPC
// This single file handles: Supabase connection, save, load, AND all app fixes

const SUPABASE_URL = 'https://dbmlmwpjvrcnzbyzsyrl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRibWxtd3BqdnJjbnpieXpzeXJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNTg3MTQsImV4cCI6MjA5NzkzNDcxNH0.vez8xEuNIgm3Flkix2fBXy1Q6nQamu0YJG6w4Ttr9sk';

// ── INIT SUPABASE ─────────────────────────────────────────
window._sbDb = null;
try {
  if (typeof supabase !== 'undefined' && supabase.createClient) {
    window._sbDb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('[SB] Supabase connected ✓');
  }
} catch(e) {
  console.error('[SB] Init error:', e.message);
}

// ── TOAST ─────────────────────────────────────────────────
function sbToast(msg, color) {
  try {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;background:'+(color||'#1e40af')+';color:#fff;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600;opacity:0;transition:opacity 0.3s;box-shadow:0 4px 12px rgba(0,0,0,.15)';
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.style.opacity = '1');
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 3000);
  } catch(e) {}
}

// ── LOADER (navy/gold) ────────────────────────────────────
function sbShowLoader(msg) {
  try {
    let el = document.getElementById('sbLoader');
    if (!el) {
      el = document.createElement('div');
      el.id = 'sbLoader';
      el.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.82);z-index:99998;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px';
      el.innerHTML = `
        <div style="width:52px;height:52px;border:4px solid rgba(255,255,255,0.15);border-top-color:#d97706;border-radius:50%;animation:sbSpin 0.8s linear infinite"></div>
        <div style="color:#fff;font-size:15px;font-weight:600;letter-spacing:.3px" id="sbLoaderMsg">Loading...</div>
        <div style="color:#d97706;font-size:12px">SalesOps Pro · Alphatec Trading OPC</div>
        <style>@keyframes sbSpin{to{transform:rotate(360deg)}}</style>`;
      document.body.appendChild(el);
    }
    const m = document.getElementById('sbLoaderMsg');
    if (m) m.textContent = msg || 'Loading...';
    el.style.display = 'flex';
  } catch(e) {}
}

function sbHideLoader() {
  try {
    const el = document.getElementById('sbLoader');
    if (el) el.style.display = 'none';
  } catch(e) {}
}

// ── TABLE MAP ─────────────────────────────────────────────
window.sbMap = {
  products:     r => ({ id:r.id, code:r.code, desc:r.desc||r.description, type:r.type, unit:r.unit, group:r.group, sp:r.selling_price||r.sp||0, pc:r.unit_cost||r.pc||0, qtyIn:r.qty_in||0, qtyOrd:r.qty_ord||0, qtyAlloc:r.qty_alloc||0, reorder:r.reorder||0 }),
  leads:        r => ({ id:r.id, name:r.name, company:r.company||'', stage:r.stage||'New Lead', value:r.value||0, owner:r.owner||'', lastContact:r.last_contact||'', nextAction:r.next_action||'', status:r.status||'Active' }),
  client_pos:   r => ({ id:r.id, num:r.po_number, client:r.client_name, date:r.date||'', status:r.status, terms:r.terms||'', prodTotal:r.prod_total||0, svcTotal:r.svc_total||0, total:r.total_amount||0 }),
  supplier_pos: r => ({ id:r.id, num:r.po_number, supplier:r.supplier_name, linked:r.linked_cpo||'', date:r.date||'', delivery:r.delivery||'', status:r.status, lines:[{type:'product'}], total:r.total_amount||0, paid:r.paid||0, balance:r.balance||0 }),
  invoices:     r => ({ id:r.id, num:r.invoice_number, poRef:r.po_ref||'', client:r.client_name, date:r.date||'', due:r.due_date||'', terms:r.terms||'', amount:r.total_amount||0, paid:r.amount_paid||0, balance:(r.total_amount||0)-(r.amount_paid||0), status:r.status }),
  expenses:     r => ({ id:r.id, ref:r.ref, date:r.date||'', month:r.month||'', cat:r.category||'', desc:r.description||'', payee:r.payee||'', amount:r.amount||0, mode:r.payment_mode||'', status:r.status||'Pending' }),
  payments:     r => ({ id:r.id, ref:r.ref, date:r.date||'', client:r.client||r.supplier||'', amount:r.amount||0, method:r.method||'', linked_inv:r.linked_inv||'' }),
  settings:     r => ({ id:r.id||1, company:r.company||'', address:r.address||'', tin:r.tin||'', terms:r.terms||'' })
};

// ── GLOBAL SAVE ───────────────────────────────────────────
window.sbSave = async function(table, row) {
  if (!window._sbDb) { sbToast('⚠️ Not connected', '#dc2626'); return false; }
  try {
    const { error } = await window._sbDb.from(table).upsert(row, { onConflict: 'id' });
    if (error) { sbToast('⚠️ Save failed: ' + error.message, '#dc2626'); console.error('[SB] Save error:', error); return false; }
    sbToast('💾 Saved to cloud!', '#1e40af');
    return true;
  } catch(e) {
    sbToast('⚠️ Error: ' + e.message, '#dc2626');
    return false;
  }
};

// ── GLOBAL LOAD ALL ───────────────────────────────────────
window.sbLoadAll = async function() {
  if (!window._sbDb) { console.warn('[SB] Not connected'); return false; }
  sbShowLoader('Loading your data from cloud...');
  let loaded = 0;
  try {
    // Load each table and push into app arrays
    const load = async (table, appArr, mapFn) => {
      try {
        const { data, error } = await window._sbDb.from(table).select('*');
        if (!error && data && data.length > 0) {
          const mapped = data.map(mapFn);
          appArr.length = 0;
          mapped.forEach(r => appArr.push(r));
          loaded++;
          console.log('[SB] Loaded', data.length, 'rows from', table);
        }
      } catch(e) { console.warn('[SB] Skip', table, e.message); }
    };

    // Map Supabase tables directly to app arrays
    if (typeof catalog       !== 'undefined') await load('products',     catalog,     window.sbMap.products);
    if (typeof leads         !== 'undefined') await load('leads',        leads,        window.sbMap.leads);
    if (typeof clientPOs     !== 'undefined') await load('client_pos',   clientPOs,    window.sbMap.client_pos);
    if (typeof supplierPOs   !== 'undefined') await load('supplier_pos', supplierPOs,  window.sbMap.supplier_pos);
    if (typeof invoices      !== 'undefined') await load('invoices',     invoices,     window.sbMap.invoices);
    if (typeof expenses      !== 'undefined') await load('expenses',     expenses,     window.sbMap.expenses);

    sbHideLoader();
    if (loaded > 0) {
      sbToast('☁️ Data loaded from cloud (' + loaded + ' tables)', '#1e40af');
      // Refresh all UI
      if (typeof refreshDash       === 'function') setTimeout(refreshDash, 100);
      if (typeof renderCatalog     === 'function') setTimeout(renderCatalog, 150);
      if (typeof updateBadges      === 'function') setTimeout(updateBadges, 200);
      if (typeof updateNumPreviews === 'function') setTimeout(updateNumPreviews, 250);
      if (typeof buildMonthSel     === 'function') setTimeout(buildMonthSel, 300);
      console.log('[SB] All UI refreshed from Supabase ✓');
    } else {
      console.log('[SB] No cloud data yet — using sample data');
    }
    return true;
  } catch(e) {
    sbHideLoader();
    console.error('[SB] Load error:', e.message);
    return false;
  }
};

// ── FIX: refreshDash infinite loop guard ─────────────────
window.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    if (typeof refreshDash === 'function' && !window._dashGuarded) {
      window._dashGuarded = true;
      const _orig = window.refreshDash;
      let _running = false;
      window.refreshDash = function() {
        if (_running) return;
        _running = true;
        try { _orig.apply(this, arguments); }
        catch(e) { console.error('[Fix] refreshDash:', e.message); }
        finally { _running = false; }
      };
      console.log('[Fix] refreshDash guard active ✓');
    }
  }, 100);
});

// ── BOOT: load from Supabase on startup ──────────────────
window.addEventListener('load', function() {
  setTimeout(function() {
    console.log('[SB] Boot loading from Supabase...');
    window.sbLoadAll();
  }, 2500);
});

// ── FIX: closePrintDoc ────────────────────────────────────
window.closePrintDoc = function() {
  const w = document.getElementById('printDocWrap');
  if (w) w.style.display = 'none';
};

window._salesopsPatchApplied = true;
console.log('[SB] supabase_sync.js v3.0 loaded ✓ | sbSave:', typeof window.sbSave, '| sbLoadAll:', typeof window.sbLoadAll);
