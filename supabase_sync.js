// SalesOps Pro — Supabase Sync v2.0
// Alphatec Trading OPC

const SUPABASE_URL = 'https://dbmlmwpjvrcnzbyzsyrl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRibWxtd3BqdnJjbnpieXpzeXJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNTg3MTQsImV4cCI6MjA5NzkzNDcxNH0.vez8xEuNIgm3Flkix2fBXy1Q6nQamu0YJG6w4Ttr9sk';

// ── TOAST NOTIFICATION ───────────────────────────────────────
function sbToast(msg, color) {
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;background:'+(color||'#1e40af')+';color:#fff;padding:10px 22px;border-radius:8px;font-size:.85rem;font-weight:600;font-family:sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.25);opacity:0;transition:opacity .3s';
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.style.opacity = '1');
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 3000);
}

// ── LOADER ───────────────────────────────────────────────────
function sbShowLoader(msg) {
  let el = document.getElementById('sbLoader');
  if (!el) {
    el = document.createElement('div');
    el.id = 'sbLoader';
    el.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.75);z-index:99998;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px';
    el.innerHTML = '<div style="width:52px;height:52px;border:5px solid #1e40af;border-top-color:#f59e0b;border-radius:50%;animation:sbSpin 0.8s linear infinite"></div><div id="sbMsg" style="color:#fff;font-size:1rem;font-weight:600;font-family:sans-serif"></div><style>@keyframes sbSpin{to{transform:rotate(360deg)}}</style>';
    document.body.appendChild(el);
  }
  document.getElementById('sbMsg').textContent = msg;
  el.style.display = 'flex';
}

function sbHideLoader() {
  const el = document.getElementById('sbLoader');
  if (el) el.style.display = 'none';
}

// ── GLOBAL SAVE FUNCTION (called from index.html) ────────────
window.sbSave = async function(table, row) {
  try {
    const { error } = await window._sbDb.from(table).upsert(row, { onConflict: 'id' });
    if (error) { sbToast('⚠️ Save failed: ' + error.message, '#dc2626'); return; }
    sbToast('💾 Saved');
  } catch(e) {
    sbToast('⚠️ Error: ' + e.message, '#dc2626');
  }
};

// ── MAP HELPERS ──────────────────────────────────────────────
window.sbMap = {
  product: r => ({ id:r.id, code:r.code, desc:r.desc, type:r.type, unit:r.unit, group:r.group, sp:r.selling_price||0, pc:r.unit_cost||0, qtyIn:r.qty_in||0, qtyOrd:r.qty_ord||0, qtyAlloc:r.qty_alloc||0, reorder:r.reorder||0 }),
  lead:    r => ({ id:r.id, name:r.name, company:r.company||'', stage:r.stage||'New Lead', value:r.value||0, owner:r.owner||'', lastContact:r.last_contact||'', nextAction:r.next_action||'', status:r.status||'Active' }),
  cpo:     r => ({ id:r.id, num:r.po_number, client:r.client_name, date:r.date||'', status:r.status, terms:r.terms||'', delivery:r.delivery||'', prodTotal:r.prod_total||0, svcTotal:r.svc_total||0, total:r.total_amount||0 }),
  spo:     r => ({ id:r.id, num:r.po_number, supplier:r.supplier_name, linked:r.linked_cpo||'', date:r.date||'', delivery:r.delivery||'', status:r.status, lines:r.lines||[{type:'product'}], total:r.total_amount||0, paid:r.paid||0, balance:r.balance||0 }),
  invoice: r => ({ id:r.id, num:r.invoice_number, client:r.client_name, poRef:r.po_ref||'', date:r.date||'', due:r.due_date||'', terms:r.terms||'', amount:r.total_amount||0, paid:r.amount_paid||0, balance:(r.total_amount||0)-(r.amount_paid||0), status:r.status }),
  expense: r => ({ id:r.id, ref:r.ref, date:r.date||'', month:r.month||'', cat:r.category||'', desc:r.description||'', payee:r.payee||'', amount:r.amount||0, mode:r.payment_mode||'', status:r.status||'Pending' }),
};

// ── LOAD ALL DATA ────────────────────────────────────────────
async function sbLoadAll(db) {
  sbShowLoader('Loading your data…');
  try {
    const [
      {data:pR,error:e1},{data:lR,error:e2},{data:cR,error:e3},
      {data:sR,error:e4},{data:iR,error:e5},{data:eR,error:e6}
    ] = await Promise.all([
      db.from('products').select('*').order('id'),
      db.from('leads').select('*').order('id'),
      db.from('client_pos').select('*').order('id'),
      db.from('supplier_pos').select('*').order('id'),
      db.from('invoices').select('*').order('id'),
      db.from('expenses').select('*').order('id'),
    ]);

    const err = e1||e2||e3||e4||e5||e6;
    if (err) throw new Error(err.message);

    if (pR && pR.length) window.catalog     = pR.map(sbMap.product);
    if (lR && lR.length) window.leads       = lR.map(sbMap.lead);
    if (cR && cR.length) window.clientPOs   = cR.map(sbMap.cpo);
    if (sR && sR.length) window.supplierPOs = sR.map(sbMap.spo);

    if (iR && iR.length) {
      window.invoices = iR.map(sbMap.invoice);
      window.arRecords = window.invoices.map((v,i) => ({
        id:i+1, ref:'AR-'+String(i+1).padStart(3,'0'),
        invNum:v.num, client:v.client, invDate:v.date, dueDate:v.due,
        amount:v.amount, paid:v.paid, balance:v.balance,
        status:v.balance===0?'Paid':v.status==='Overdue'?'Overdue':v.paid>0?'Partially Paid':'Outstanding'
      }));
    }

    if (sR && sR.length) {
      window.apRecords = window.supplierPOs.map((v,i) => ({
        id:i+1, ref:'AP-'+String(i+1).padStart(3,'0'),
        spoNum:v.num, supplier:v.supplier, billDate:v.date, dueDate:v.date,
        amount:v.total, paid:v.paid, balance:v.balance,
        status:v.balance===0?'Paid':v.paid>0?'Partially Paid':'Outstanding'
      }));
    }

    if (eR && eR.length) window.expenses = eR.map(sbMap.expense);

    // Re-render all modules
    ['renderCatalog','renderLeads','renderCPO','renderSPO','renderInv',
     'renderExp','renderAR','renderAP','updateBadges','refreshDash'
    ].forEach(fn => { try{ if(typeof window[fn]==='function') window[fn](); }catch(e){} });

    sbHideLoader();
    sbToast('✅ Data loaded', '#16a34a');

  } catch(err) {
    sbHideLoader();
    sbToast('⚠️ Load error: ' + err.message, '#dc2626');
    console.error('[SB] Load error:', err);
  }
}

// ── MIGRATE SAMPLE DATA (first run only) ────────────────────
async function sbMigrate(db) {
  sbShowLoader('First run — saving data…');
  try {
    await db.from('products').upsert(window.catalog.map(c=>({id:c.id,code:c.code,desc:c.desc,type:c.type,unit:c.unit,group:c.group,selling_price:c.sp||0,unit_cost:c.pc||0,qty_in:c.qtyIn||0,qty_ord:c.qtyOrd||0,qty_alloc:c.qtyAlloc||0,reorder:c.reorder||0})),{onConflict:'id'});
    await db.from('leads').upsert(window.leads.map(l=>({id:l.id,name:l.name,company:l.company||'',stage:l.stage,value:l.value||0,owner:l.owner||'',last_contact:l.lastContact||null,next_action:l.nextAction||'',status:l.status||'Active'})),{onConflict:'id'});
    await db.from('client_pos').upsert(window.clientPOs.map(p=>({id:p.id,po_number:p.num,client_name:p.client,date:p.date||null,status:p.status,terms:p.terms||'',delivery:p.delivery||null,prod_total:p.prodTotal||0,svc_total:p.svcTotal||0,total_amount:p.total||0})),{onConflict:'id'});
    await db.from('supplier_pos').upsert(window.supplierPOs.map(s=>({id:s.id,po_number:s.num,supplier_name:s.supplier,linked_cpo:s.linked||null,date:s.date||null,delivery:s.delivery||null,status:s.status,lines:s.lines||[{type:'product'}],total_amount:s.total||0,paid:s.paid||0,balance:s.balance||0})),{onConflict:'id'});
    await db.from('invoices').upsert(window.invoices.map(i=>({id:i.id,invoice_number:i.num,client_name:i.client,po_ref:i.poRef||null,date:i.date||null,due_date:i.due||null,terms:i.terms||'',total_amount:i.amount||0,amount_paid:i.paid||0,status:i.status})),{onConflict:'id'});
    await db.from('expenses').upsert(window.expenses.map(e=>({id:e.id,ref:e.ref,date:e.date||null,month:e.month||'',category:e.cat||'',description:e.desc||'',payee:e.payee||'',amount:e.amount||0,payment_mode:e.mode||'',status:e.status||'Approved'})),{onConflict:'id'});
    sbHideLoader();
    sbToast('✅ Sample data saved!', '#16a34a');
  } catch(err) {
    sbHideLoader();
    sbToast('⚠️ Migration error: ' + err.message, '#dc2626');
    console.error('[SB] Migration error:', err);
  }
}

// ── BOOT ─────────────────────────────────────────────────────
// Simple: just wait for the page to fully load, then start
window.addEventListener('load', async function() {
  // Confirm Supabase CDN loaded
  if (!window.supabase || !window.supabase.createClient) {
    sbToast('⚠️ Supabase library not loaded', '#dc2626');
    console.error('[SB] window.supabase not found');
    return;
  }

  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  window._sbDb = db; // make available to sbSave

  try {
    const { data, error } = await db.from('leads').select('id').limit(1);
    if (error) throw new Error(error.message);

    if (!data || data.length === 0) {
      await sbMigrate(db);
    } else {
      await sbLoadAll(db);
    }
  } catch(err) {
    sbToast('⚠️ DB init failed: ' + err.message, '#dc2626');
    console.error('[SB] Init error:', err);
  }
});
