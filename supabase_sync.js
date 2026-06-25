// SalesOps Pro — Supabase Sync v2.1 FIXED
// Alphatec Trading OPC

const SUPABASE_URL = 'https://dbmlmwpjvrcnzbyzsyrl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRibWxtd3BqdnJjbnpieXpzeXJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNTg3MTQsImV4cCI6MjA5NzkzNDcxNH0.vez8xEuNIgm3Flkix2fBXy1Q6nQamu0YJG6w4Ttr9sk';

// Initialize Supabase client safely
window._sbDb = null;
(function initSupabase() {
  try {
    if (typeof supabase !== 'undefined' && supabase.createClient) {
      window._sbDb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      console.log('[SB] Supabase connected ✓');
    } else {
      console.error('[SB] Supabase CDN not loaded yet');
    }
  } catch(e) {
    console.error('[SB] Init error:', e.message);
  }
})();

// — TOAST NOTIFICATION ————————————————————————
function sbToast(msg, color) {
  try {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;background:'+(color||'#1e40af')+';color:#fff;padding:12px 20px;border-radius:8px;font-size:14px;opacity:0;transition:opacity 0.3s';
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.style.opacity = '1');
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 3000);
  } catch(e) {}
}

// — LOADER ————————————————————————————————————
function sbShowLoader(msg) {
  try {
    let el = document.getElementById('sbLoader');
    if (!el) {
      el = document.createElement('div');
      el.id = 'sbLoader';
      el.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.75);z-index:99998;display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;flex-direction:column;gap:12px';
      el.innerHTML = '<div style="width:40px;height:40px;border:4px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite"></div><div id="sbLoaderMsg"></div><style>@keyframes spin{to{transform:rotate(360deg)}}</style>';
      document.body.appendChild(el);
    }
    const m = document.getElementById('sbLoaderMsg');
    if (m) m.textContent = msg || 'Saving...';
    el.style.display = 'flex';
  } catch(e) {}
}

function sbHideLoader() {
  try {
    const el = document.getElementById('sbLoader');
    if (el) el.style.display = 'none';
  } catch(e) {}
}

// — TABLE MAP (maps table names to row-builder functions) ————————
window.sbMap = {
  product:  r => ({ id:r.id, code:r.code, desc:r.desc, type:r.type, unit:r.unit, group:r.group, sp:r.selling_price||0, cost:r.cost||0 }),
  lead:     r => ({ id:r.id, name:r.name, company:r.company||'', stage:r.stage||'New Lead', value:r.value||0, owner:r.owner||'', notes:r.notes||'' }),
  cpo:      r => ({ id:r.id, num:r.po_number, client:r.client_name, date:r.date||'', status:r.status, terms:r.terms||'', linked:r.linked_cpo||'', date_delivery:r.date_delivery||'' }),
  spo:      r => ({ id:r.id, num:r.po_number, supplier:r.supplier_name, linked:r.linked_cpo||'', date:r.date||'', date_delivery:r.date_delivery||'' }),
  invoice:  r => ({ id:r.id, num:r.invoice_number, client:r.client_name, poRef:r.po_ref||'', date:r.date||'', due:r.due_date||'', amount:r.amount||0, paid:r.paid||0, status:r.status||'unpaid' }),
  expense:  r => ({ id:r.id, ref:r.ref, date:r.date||'', month:r.month||'', cat:r.category||'', desc:r.description||'', amount:r.amount||0 }),
  payment:  r => ({ id:r.id, ref:r.ref, date:r.date||'', client:r.client||'', amount:r.amount||0, method:r.method||'', linked_inv:r.linked_inv||'' }),
  settings: r => ({ id:r.id||1, company:r.company||'', address:r.address||'', tin:r.tin||'', terms:r.terms||'' })
};

// — GLOBAL SAVE ————————————————————————————————
window.sbSave = async function(table, row) {
  if (!window._sbDb) { sbToast('⚠️ Supabase not connected', '#dc2626'); return false; }
  try {
    const { error } = await window._sbDb.from(table).upsert(row, { onConflict: 'id' });
    if (error) { sbToast('⚠️ Save failed: ' + error.message, '#dc2626'); return false; }
    sbToast('💾 Saved!');
    return true;
  } catch(e) {
    sbToast('⚠️ Error: ' + e.message, '#dc2626');
    return false;
  }
};

// — GLOBAL LOAD ALL ————————————————————————————
window.sbLoadAll = async function(db) {
  if (!window._sbDb) { console.warn('[SB] Not connected, using local data'); return false; }
  sbShowLoader('Loading data from cloud...');
  let loaded = 0;
  try {
    const tables = Object.keys(window.sbMap);
    for (const table of tables) {
      try {
        const { data, error } = await window._sbDb.from(table).select('*');
        if (!error && data && data.length > 0) {
          // Map to the app's expected format
          const mapped = data.map(window.sbMap[table]);
          // Store in the app's data object if it exists
          if (db && db[table] !== undefined) {
            db[table] = mapped;
            loaded++;
          } else if (db) {
            // Try common plural/singular variations
            const keys = [table, table+'s', table.replace(/s$/,'')];
            for (const k of keys) {
              if (db[k] !== undefined) { db[k] = mapped; loaded++; break; }
            }
          }
        }
      } catch(tableErr) {
        console.warn('[SB] Could not load table:', table, tableErr.message);
      }
    }
    sbHideLoader();
    if (loaded > 0) {
      sbToast('☁️ ' + loaded + ' tables loaded from Supabase');
      console.log('[SB] Loaded', loaded, 'tables');
    } else {
      console.log('[SB] Connected but no cloud data yet — using local data');
    }
    return true;
  } catch(e) {
    sbHideLoader();
    console.error('[SB] Load error:', e.message);
    return false;
  }
};

// — MIGRATION (safe, non-crashing) ————————————————
window.sbMigrate = async function(db) {
  if (!window._sbDb) { console.warn('[SB] Not connected, skipping migration'); return false; }
  if (!db || typeof db !== 'object') { console.warn('[SB] No db object provided'); return false; }
  sbShowLoader('Syncing to cloud...');
  let saved = 0;
  try {
    const tableKeyMap = {
      product:  ['products','product'],
      lead:     ['leads','lead'],
      cpo:      ['clientPOs','cpos','cpo'],
      spo:      ['supplierPOs','spos','spo'],
      invoice:  ['invoices','invoice'],
      expense:  ['expenses','expense'],
      payment:  ['payments','payment'],
      settings: ['settings','setting']
    };
    for (const [table, keys] of Object.entries(tableKeyMap)) {
      let rows = null;
      for (const k of keys) {
        if (db[k] && Array.isArray(db[k]) && db[k].length > 0) { rows = db[k]; break; }
      }
      if (!rows || rows.length === 0) continue;
      try {
        const mapped = rows.map(window.sbMap[table]);
        const { error } = await window._sbDb.from(table).upsert(mapped, { onConflict: 'id' });
        if (!error) { saved += rows.length; }
        else { console.warn('[SB] Migration error on', table, ':', error.message); }
      } catch(tableErr) {
        console.warn('[SB] Could not migrate table:', table, tableErr.message);
      }
    }
    sbHideLoader();
    sbToast('☁️ Migrated ' + saved + ' records to Supabase');
    console.log('[SB] Migration complete:', saved, 'records');
    return true;
  } catch(e) {
    sbHideLoader();
    console.error('[SB] Migration failed:', e.message);
    return false;
  }
};

console.log('[SB] supabase_sync.js loaded ✓ | sbSave:', typeof window.sbSave, '| sbMap:', typeof window.sbMap);
