// ═══════════════════════════════════════════════════════════════
// SalesOps Pro — Supabase Sync Layer v1.3
// Alphatec Trading OPC · Sta. Rosa, Laguna
// ═══════════════════════════════════════════════════════════════

(function () {

  const SUPABASE_URL = 'https://dbmlmwpjvrcnzbyzsyrl.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRibWxtd3BqdnJjbnpieXpzeXJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNTg3MTQsImV4cCI6MjA5NzkzNDcxNH0.vez8xEuNIgm3Flkix2fBXy1Q6nQamu0YJG6w4Ttr9sk';

  // Wait for supabase CDN to be ready before doing anything
  function waitForSupabase(cb) {
    if (window.supabase && window.supabase.createClient) {
      cb();
    } else {
      setTimeout(() => waitForSupabase(cb), 100);
    }
  }

  // Wait for app data arrays to be ready
  function waitForAppData(cb) {
    if (
      Array.isArray(window.catalog) &&
      Array.isArray(window.leads) &&
      Array.isArray(window.clientPOs) &&
      Array.isArray(window.supplierPOs) &&
      Array.isArray(window.invoices) &&
      Array.isArray(window.expenses)
    ) {
      cb();
    } else {
      setTimeout(() => waitForAppData(cb), 100);
    }
  }

  // ── UI HELPERS ───────────────────────────────────────────────
  function showLoader(msg) {
    let el = document.getElementById('sbLoader');
    if (!el) {
      el = document.createElement('div');
      el.id = 'sbLoader';
      el.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.75);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px';
      el.innerHTML = '<div style="width:52px;height:52px;border:5px solid #1e40af;border-top-color:#f59e0b;border-radius:50%;animation:sbSpin 0.8s linear infinite"></div><div id="sbLoaderMsg" style="color:#fff;font-size:1rem;font-weight:600;font-family:sans-serif;letter-spacing:.3px"></div><style>@keyframes sbSpin{to{transform:rotate(360deg)}}</style>';
      document.body.appendChild(el);
    }
    document.getElementById('sbLoaderMsg').textContent = msg || 'Loading…';
    el.style.display = 'flex';
  }

  function hideLoader() {
    const el = document.getElementById('sbLoader');
    if (el) el.style.display = 'none';
  }

  function showToast(msg, color) {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99998;background:'+(color||'#1e40af')+';color:#fff;padding:10px 22px;border-radius:8px;font-size:.85rem;font-weight:600;font-family:sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.25);opacity:0;transition:opacity .3s';
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => { t.style.opacity = '1'; });
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 3500);
  }

  // ── SAVE HELPER ──────────────────────────────────────────────
  async function saveToDB(table, row) {
    try {
      const { error } = await db.from(table).upsert(row, { onConflict: 'id' });
      if (error) {
        console.error('[Supabase] Save failed on ' + table + ':', error.message);
        showToast('⚠️ Not saved: ' + error.message, '#dc2626');
        return false;
      }
      showToast('💾 Saved');
      return true;
    } catch (err) {
      console.error('[Supabase] Exception on ' + table + ':', err);
      showToast('⚠️ Save error — check console', '#dc2626');
      return false;
    }
  }

  // ── ROW MAPPERS (DB → app format) ────────────────────────────
  const map = {
    product: r => ({ id:r.id, code:r.code, desc:r.desc, type:r.type, unit:r.unit, group:r.group, sp:r.selling_price||0, pc:r.unit_cost||0, qtyIn:r.qty_in||0, qtyOrd:r.qty_ord||0, qtyAlloc:r.qty_alloc||0, reorder:r.reorder||0 }),
    lead:    r => ({ id:r.id, name:r.name, company:r.company||'', stage:r.stage||'New Lead', value:r.value||0, owner:r.owner||'', lastContact:r.last_contact||'', nextAction:r.next_action||'', status:r.status||'Active' }),
    cpo:     r => ({ id:r.id, num:r.po_number, client:r.client_name, date:r.date||'', status:r.status, terms:r.terms||'', delivery:r.delivery||'', prodTotal:r.prod_total||0, svcTotal:r.svc_total||0, total:r.total_amount||0 }),
    spo:     r => ({ id:r.id, num:r.po_number, supplier:r.supplier_name, linked:r.linked_cpo||'', date:r.date||'', delivery:r.delivery||'', status:r.status, lines:r.lines||[{type:'product'}], total:r.total_amount||0, paid:r.paid||0, balance:r.balance||0 }),
    invoice: r => ({ id:r.id, num:r.invoice_number, client:r.client_name, poRef:r.po_ref||'', date:r.date||'', due:r.due_date||'', terms:r.terms||'', amount:r.total_amount||0, paid:r.amount_paid||0, balance:(r.total_amount||0)-(r.amount_paid||0), status:r.status }),
    expense: r => ({ id:r.id, ref:r.ref, date:r.date||'', month:r.month||'', cat:r.category||'', desc:r.description||'', payee:r.payee||'', amount:r.amount||0, mode:r.payment_mode||'', status:r.status||'Pending' }),
  };

  // ── ROW MAPPERS (app format → DB) ────────────────────────────
  const toDB = {
    product: c => ({ id:c.id, code:c.code, desc:c.desc, type:c.type, unit:c.unit, group:c.group, selling_price:c.sp||0, unit_cost:c.pc||0, qty_in:c.qtyIn||0, qty_ord:c.qtyOrd||0, qty_alloc:c.qtyAlloc||0, reorder:c.reorder||0 }),
    lead:    l => ({ id:l.id, name:l.name, company:l.company||'', stage:l.stage, value:l.value||0, owner:l.owner||'', last_contact:l.lastContact||null, next_action:l.nextAction||'', status:l.status||'Active' }),
    cpo:     p => ({ id:p.id, po_number:p.num, client_name:p.client, date:p.date||null, status:p.status, terms:p.terms||'', delivery:p.delivery||null, prod_total:p.prodTotal||0, svc_total:p.svcTotal||0, total_amount:p.total||0 }),
    spo:     s => ({ id:s.id, po_number:s.num, supplier_name:s.supplier, linked_cpo:s.linked||null, date:s.date||null, delivery:s.delivery||null, status:s.status, lines:s.lines||[{type:'product'}], total_amount:s.total||0, paid:s.paid||0, balance:s.balance||0 }),
    invoice: i => ({ id:i.id, invoice_number:i.num, client_name:i.client, po_ref:i.poRef||null, date:i.date||null, due_date:i.due||null, terms:i.terms||'', total_amount:i.amount||0, amount_paid:i.paid||0, status:i.status }),
    expense: e => ({ id:e.id, ref:e.ref, date:e.date||null, month:e.month||'', category:e.cat||'', description:e.desc||'', payee:e.payee||'', amount:e.amount||0, payment_mode:e.mode||'', status:e.status||'Pending' }),
  };

  // ── LOAD ALL DATA FROM SUPABASE ──────────────────────────────
  async function loadAllData() {
    showLoader('Loading your data…');
    try {
      const [
        { data: pRows, error: e1 },
        { data: lRows, error: e2 },
        { data: cRows, error: e3 },
        { data: sRows, error: e4 },
        { data: iRows, error: e5 },
        { data: eRows, error: e6 },
      ] = await Promise.all([
        db.from('products').select('*').order('id'),
        db.from('leads').select('*').order('id'),
        db.from('client_pos').select('*').order('id'),
        db.from('supplier_pos').select('*').order('id'),
        db.from('invoices').select('*').order('id'),
        db.from('expenses').select('*').order('id'),
      ]);

      const firstErr = e1||e2||e3||e4||e5||e6;
      if (firstErr) throw new Error(firstErr.message);

      if (pRows && pRows.length > 0) window.catalog     = pRows.map(map.product);
      if (lRows && lRows.length > 0) window.leads       = lRows.map(map.lead);
      if (cRows && cRows.length > 0) window.clientPOs   = cRows.map(map.cpo);
      if (sRows && sRows.length > 0) window.supplierPOs = sRows.map(map.spo);

      if (iRows && iRows.length > 0) {
        window.invoices = iRows.map(map.invoice);
        window.arRecords = window.invoices.map((v, i) => ({
          id: i+1, ref: 'AR-'+String(i+1).padStart(3,'0'),
          invNum: v.num, client: v.client, invDate: v.date, dueDate: v.due,
          amount: v.amount, paid: v.paid, balance: v.balance,
          status: v.balance===0 ? 'Paid' : v.status==='Overdue' ? 'Overdue' : v.paid>0 ? 'Partially Paid' : 'Outstanding'
        }));
      }

      if (sRows && sRows.length > 0) {
        window.apRecords = window.supplierPOs.map((v, i) => ({
          id: i+1, ref: 'AP-'+String(i+1).padStart(3,'0'),
          spoNum: v.num, supplier: v.supplier, billDate: v.date, dueDate: v.date,
          amount: v.total, paid: v.paid, balance: v.balance,
          status: v.balance===0 ? 'Paid' : v.paid>0 ? 'Partially Paid' : 'Outstanding'
        }));
      }

      if (eRows && eRows.length > 0) window.expenses = eRows.map(map.expense);

      // Re-render all modules
      ['renderCatalog','renderLeads','renderCPO','renderSPO','renderInv',
       'renderExp','renderAR','renderAP','updateBadges','refreshDash'
      ].forEach(fn => { try { if (typeof window[fn]==='function') window[fn](); } catch(e){} });

      hideLoader();
      showToast('✅ Data loaded', '#16a34a');

    } catch (err) {
      hideLoader();
      console.error('[Supabase] Load error:', err);
      showToast('⚠️ Load failed: ' + err.message, '#dc2626');
    }
  }

  // ── MIGRATE SAMPLE DATA (first run) ─────────────────────────
  async function migrateSampleData() {
    showLoader('Saving sample data…');
    try {
      await db.from('products').upsert(window.catalog.map(toDB.product),     { onConflict: 'id' });
      await db.from('leads').upsert(window.leads.map(toDB.lead),             { onConflict: 'id' });
      await db.from('client_pos').upsert(window.clientPOs.map(toDB.cpo),     { onConflict: 'id' });
      await db.from('supplier_pos').upsert(window.supplierPOs.map(toDB.spo), { onConflict: 'id' });
      await db.from('invoices').upsert(window.invoices.map(toDB.invoice),    { onConflict: 'id' });
      await db.from('expenses').upsert(window.expenses.map(toDB.expense),    { onConflict: 'id' });
      hideLoader();
      showToast('✅ Sample data saved!', '#16a34a');
    } catch (err) {
      hideLoader();
      console.error('[Supabase] Migration error:', err);
      showToast('⚠️ Migration failed: ' + err.message, '#dc2626');
    }
  }

  // ── PATCH SAVE FUNCTIONS ─────────────────────────────────────
  function patchSaveFunctions() {

    // LEADS
    const _saveLead = window.saveLead;
    window.saveLead = function () {
      _saveLead();
      const item = window.leads[window.leads.length - 1];
      if (item) saveToDB('leads', toDB.lead(item));
    };

    // CATALOG
    const _saveCatalog = window.saveCatalogItem;
    window.saveCatalogItem = function () {
      _saveCatalog();
      // editingCatId was cleared inside _saveCatalog, so find by last position
      const item = window.catalog[window.catalog.length - 1];
      if (item) saveToDB('products', toDB.product(item));
    };

    // CLIENT POs
    const _saveCPO = window.saveCPO;
    window.saveCPO = function () {
      _saveCPO();
      const item = window.clientPOs[window.clientPOs.length - 1];
      if (item) saveToDB('client_pos', toDB.cpo(item));
    };

    // SUPPLIER POs
    const _saveSPO = window.saveSPO;
    window.saveSPO = function () {
      _saveSPO();
      const item = window.supplierPOs[window.supplierPOs.length - 1];
      if (item) saveToDB('supplier_pos', toDB.spo(item));
    };

    // INVOICES
    const _saveInv = window.saveInv;
    window.saveInv = function () {
      _saveInv();
      const item = window.invoices[window.invoices.length - 1];
      if (item) saveToDB('invoices', toDB.invoice(item));
    };

    // EXPENSES
    const _saveExp = window.saveExp;
    window.saveExp = function () {
      _saveExp();
      const item = window.expenses[window.expenses.length - 1];
      if (item) saveToDB('expenses', toDB.expense(item));
    };

    // AR PAYMENT — update invoice paid amounts
    const _saveARPay = window.saveARPay;
    window.saveARPay = async function () {
      _saveARPay();
      try {
        for (const inv of window.invoices) {
          await db.from('invoices').update({ amount_paid: inv.paid, status: inv.status }).eq('invoice_number', inv.num);
        }
        showToast('💾 AR Payment saved');
      } catch(e) { console.error('[Supabase] AR pay error:', e); }
    };

    // AP PAYMENT — update supplier PO paid amounts
    const _saveAPPay = window.saveAPPay;
    window.saveAPPay = async function () {
      _saveAPPay();
      try {
        for (const spo of window.supplierPOs) {
          await db.from('supplier_pos').update({ paid: spo.paid, balance: spo.balance, status: spo.status }).eq('po_number', spo.num);
        }
        showToast('💾 AP Payment saved');
      } catch(e) { console.error('[Supabase] AP pay error:', e); }
    };
  }

  // ── STARTUP ──────────────────────────────────────────────────
  async function init(db_instance) {
    window.db = db_instance; // make globally accessible
    showLoader('Connecting to Supabase…');

    try {
      // Check if leads table already has data
      const { data, error } = await db_instance.from('leads').select('id').limit(1);
      if (error) throw new Error(error.message);

      if (!data || data.length === 0) {
        await migrateSampleData();
      } else {
        await loadAllData();
      }
    } catch (err) {
      hideLoader();
      console.error('[Supabase] Init error:', err);
      showToast('⚠️ DB init failed: ' + err.message, '#dc2626');
    }
  }

  // ── BOOT SEQUENCE ────────────────────────────────────────────
  // Wait for DOM, then Supabase CDN, then app data arrays, then go
  document.addEventListener('DOMContentLoaded', function () {
    waitForSupabase(function () {
      const db_instance = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      // Overwrite the module-level db reference
      db = db_instance;
      waitForAppData(function () {
        patchSaveFunctions(); // patch first so new saves work immediately
        init(db_instance);    // then load data
      });
    });
  });

  // Placeholder until real client is created
  let db = { from: () => ({ select: () => Promise.resolve({data:[], error:null}), upsert: () => Promise.resolve({error:null}), insert: () => Promise.resolve({error:null}), update: () => ({ eq: () => Promise.resolve({error:null}) }), delete: () => ({ eq: () => Promise.resolve({error:null}) }) }) };

})();
