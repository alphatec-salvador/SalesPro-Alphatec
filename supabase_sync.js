// ═══════════════════════════════════════════════════════════════
// SalesOps Pro — Supabase Sync Layer v1.2
// Alphatec Trading OPC · Sta. Rosa, Laguna
// ═══════════════════════════════════════════════════════════════

(function () {

  // ── 1. SUPABASE CONNECTION ───────────────────────────────────
  const SUPABASE_URL = 'https://dbmlmwpjvrcnzbyzsyrl.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRibWxtd3BqdnJjbnpieXpzeXJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNTg3MTQsImV4cCI6MjA5NzkzNDcxNH0.vez8xEuNIgm3Flkix2fBXy1Q6nQamu0YJG6w4Ttr9sk';
  const { createClient } = window.supabase;
  const db = createClient(SUPABASE_URL, SUPABASE_KEY);

  // ── 2. UI HELPERS ────────────────────────────────────────────
  function showLoader(msg) {
    let el = document.getElementById('sbLoader');
    if (!el) {
      el = document.createElement('div');
      el.id = 'sbLoader';
      el.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.7);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px';
      el.innerHTML = '<div style="width:48px;height:48px;border:4px solid #1e40af;border-top-color:#f59e0b;border-radius:50%;animation:sbSpin 0.8s linear infinite"></div><div id="sbLoaderMsg" style="color:#fff;font-size:1rem;font-weight:600;font-family:sans-serif"></div><style>@keyframes sbSpin{to{transform:rotate(360deg)}}</style>';
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
    t.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99998;background:'+(color||'#1e40af')+';color:#fff;padding:10px 20px;border-radius:8px;font-size:.85rem;font-weight:600;font-family:sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.25);opacity:0;transition:opacity .3s';
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => { t.style.opacity = '1'; });
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 3500);
  }

  // ── 3. SAVE HELPER ───────────────────────────────────────────
  // Central function — logs errors visibly so we can debug
  async function saveToDB(table, row) {
    try {
      const { data, error } = await db.from(table).upsert(row, { onConflict: 'id' });
      if (error) {
        console.error('Supabase save error [' + table + ']:', error);
        showToast('⚠️ Save failed: ' + error.message, '#dc2626');
        return false;
      }
      showToast('💾 Saved to database');
      return true;
    } catch (err) {
      console.error('Supabase exception [' + table + ']:', err);
      showToast('⚠️ DB error — check console', '#dc2626');
      return false;
    }
  }

  // ── 4. MAP HELPERS (Supabase row → app object) ───────────────
  function mapProduct(r) {
    return { id:r.id, code:r.code, desc:r.desc, type:r.type, unit:r.unit, group:r.group, sp:r.selling_price||0, pc:r.unit_cost||0, qtyIn:r.qty_in||0, qtyOrd:r.qty_ord||0, qtyAlloc:r.qty_alloc||0, reorder:r.reorder||0 };
  }
  function mapLead(r) {
    return { id:r.id, name:r.name, company:r.company||'', stage:r.stage||'New Lead', value:r.value||0, owner:r.owner||'', lastContact:r.last_contact||'', nextAction:r.next_action||'', status:r.status||'Active' };
  }
  function mapClientPO(r) {
    return { id:r.id, num:r.po_number, client:r.client_name, date:r.date, status:r.status, terms:r.terms, delivery:r.delivery||'', prodTotal:r.prod_total||0, svcTotal:r.svc_total||0, total:r.total_amount||0 };
  }
  function mapSupplierPO(r) {
    return { id:r.id, num:r.po_number, supplier:r.supplier_name, linked:r.linked_cpo||'', date:r.date, delivery:r.delivery||'', status:r.status, lines:r.lines||[{type:'product'}], total:r.total_amount||0, paid:r.paid||0, balance:r.balance||0 };
  }
  function mapInvoice(r) {
    return { id:r.id, num:r.invoice_number, client:r.client_name, poRef:r.po_ref||'', date:r.date, due:r.due_date, terms:r.terms, amount:r.total_amount||0, paid:r.amount_paid||0, balance:(r.total_amount||0)-(r.amount_paid||0), status:r.status };
  }
  function mapExpense(r) {
    return { id:r.id, ref:r.ref, date:r.date, month:r.month, cat:r.category, desc:r.description, payee:r.payee, amount:r.amount||0, mode:r.payment_mode, status:r.status };
  }

  // ── 5. LOAD ALL DATA ─────────────────────────────────────────
  async function loadAllData() {
    showLoader('Loading from database…');
    try {
      const [
        { data: pRows,   error: e1 },
        { data: lRows,   error: e2 },
        { data: cRows,   error: e3 },
        { data: sRows,   error: e4 },
        { data: iRows,   error: e5 },
        { data: eRows,   error: e6 },
      ] = await Promise.all([
        db.from('products').select('*').order('id'),
        db.from('leads').select('*').order('id'),
        db.from('client_pos').select('*').order('id'),
        db.from('supplier_pos').select('*').order('id'),
        db.from('invoices').select('*').order('id'),
        db.from('expenses').select('*').order('id'),
      ]);

      if (e1||e2||e3||e4||e5||e6) {
        const msg = (e1||e2||e3||e4||e5||e6).message;
        throw new Error(msg);
      }

      if (pRows.length > 0) window.catalog      = pRows.map(mapProduct);
      if (lRows.length > 0) window.leads        = lRows.map(mapLead);
      if (cRows.length > 0) window.clientPOs    = cRows.map(mapClientPO);
      if (sRows.length > 0) window.supplierPOs  = sRows.map(mapSupplierPO);

      if (iRows.length > 0) {
        window.invoices = iRows.map(mapInvoice);
        window.arRecords = window.invoices.map((v,i) => ({
          id:i+1, ref:'AR-'+String(i+1).padStart(3,'0'),
          invNum:v.num, client:v.client, invDate:v.date, dueDate:v.due,
          amount:v.amount, paid:v.paid, balance:v.balance,
          status:v.balance===0?'Paid':v.status==='Overdue'?'Overdue':v.paid>0?'Partially Paid':'Outstanding'
        }));
      }

      if (sRows.length > 0) {
        window.apRecords = window.supplierPOs.map((v,i) => ({
          id:i+1, ref:'AP-'+String(i+1).padStart(3,'0'),
          spoNum:v.num, supplier:v.supplier, billDate:v.date, dueDate:v.date,
          amount:v.total, paid:v.paid, balance:v.balance,
          status:v.balance===0?'Paid':v.paid>0?'Partially Paid':'Outstanding'
        }));
      }

      if (eRows.length > 0) window.expenses = eRows.map(mapExpense);

      // Re-render everything
      ['renderCatalog','renderLeads','renderCPO','renderSPO','renderInv',
       'renderExp','renderAR','renderAP','updateBadges','refreshDash'
      ].forEach(fn => { if (typeof window[fn]==='function') window[fn](); });

      hideLoader();
      showToast('✅ Data loaded', '#16a34a');

    } catch (err) {
      hideLoader();
      console.error('Load error:', err);
      showToast('⚠️ Load failed: ' + err.message, '#dc2626');
    }
  }

  // ── 6. PATCH SAVE FUNCTIONS ──────────────────────────────────
  window.addEventListener('load', function () {

    // LEADS
    const _saveLead = window.saveLead;
    window.saveLead = function () {
      const prevLen = window.leads.length;
      _saveLead();
      const item = window.leads.find((l, i) => i >= prevLen) || window.leads[window.leads.length - 1];
      if (!item) return;
      saveToDB('leads', {
        id: item.id, name: item.name, company: item.company||'',
        stage: item.stage, value: item.value||0, owner: item.owner||'',
        last_contact: item.lastContact||null, next_action: item.nextAction||'',
        status: item.status||'Active'
      });
    };

    // PRODUCT CATALOG
    const _saveCatalog = window.saveCatalogItem;
    window.saveCatalogItem = function () {
      const prevLen = window.catalog.length;
      _saveCatalog();
      const item = window.catalog[window.catalog.length - 1];
      if (!item) return;
      saveToDB('products', {
        id: item.id, code: item.code, desc: item.desc, type: item.type,
        unit: item.unit, group: item.group,
        selling_price: item.sp||0, unit_cost: item.pc||0,
        qty_in: item.qtyIn||0, qty_ord: item.qtyOrd||0,
        qty_alloc: item.qtyAlloc||0, reorder: item.reorder||0
      });
    };

    // CLIENT POs
    const _saveCPO = window.saveCPO;
    window.saveCPO = function () {
      _saveCPO();
      const item = window.clientPOs[window.clientPOs.length - 1];
      if (!item) return;
      saveToDB('client_pos', {
        id: item.id, po_number: item.num, client_name: item.client,
        date: item.date||null, status: item.status, terms: item.terms||'',
        delivery: item.delivery||null,
        prod_total: item.prodTotal||0, svc_total: item.svcTotal||0,
        total_amount: item.total||0
      });
    };

    // SUPPLIER POs
    const _saveSPO = window.saveSPO;
    window.saveSPO = function () {
      _saveSPO();
      const item = window.supplierPOs[window.supplierPOs.length - 1];
      if (!item) return;
      saveToDB('supplier_pos', {
        id: item.id, po_number: item.num, supplier_name: item.supplier,
        linked_cpo: item.linked||null, date: item.date||null,
        delivery: item.delivery||null, status: item.status,
        lines: item.lines||[{type:'product'}],
        total_amount: item.total||0, paid: item.paid||0, balance: item.balance||0
      });
    };

    // INVOICES
    const _saveInv = window.saveInv;
    window.saveInv = function () {
      _saveInv();
      const item = window.invoices[window.invoices.length - 1];
      if (!item) return;
      saveToDB('invoices', {
        id: item.id, invoice_number: item.num, client_name: item.client,
        po_ref: item.poRef||null, date: item.date||null,
        due_date: item.due||null, terms: item.terms||'',
        total_amount: item.amount||0, amount_paid: item.paid||0,
        status: item.status
      });
    };

    // EXPENSES
    const _saveExp = window.saveExp;
    window.saveExp = function () {
      _saveExp();
      const item = window.expenses[window.expenses.length - 1];
      if (!item) return;
      saveToDB('expenses', {
        id: item.id, ref: item.ref, date: item.date||null,
        month: item.month||'', category: item.cat||'',
        description: item.desc||'', payee: item.payee||'',
        amount: item.amount||0, payment_mode: item.mode||'',
        status: item.status||'Pending'
      });
    };

    // AR PAYMENT
    const _saveARPay = window.saveARPay;
    window.saveARPay = async function () {
      _saveARPay();
      for (const inv of window.invoices) {
        await db.from('invoices').update({ amount_paid: inv.paid, status: inv.status }).eq('invoice_number', inv.num);
      }
      showToast('💾 AR Payment saved');
    };

    // AP PAYMENT
    const _saveAPPay = window.saveAPPay;
    window.saveAPPay = async function () {
      _saveAPPay();
      for (const spo of window.supplierPOs) {
        await db.from('supplier_pos').update({ paid: spo.paid, balance: spo.balance, status: spo.status }).eq('po_number', spo.num);
      }
      showToast('💾 AP Payment saved');
    };

    // ── 7. FIRST RUN: migrate sample data, then load ──────────
    async function init() {
      showLoader('Connecting to Supabase…');
      try {
        const { data, error } = await db.from('leads').select('id').limit(1);
        if (error) throw new Error(error.message);

        if (!data || data.length === 0) {
          // First run — push sample data up
          showLoader('First run — saving sample data…');

          await db.from('products').upsert(window.catalog.map(c => ({
            id:c.id, code:c.code, desc:c.desc, type:c.type, unit:c.unit, group:c.group,
            selling_price:c.sp||0, unit_cost:c.pc||0, qty_in:c.qtyIn||0,
            qty_ord:c.qtyOrd||0, qty_alloc:c.qtyAlloc||0, reorder:c.reorder||0
          })), { onConflict: 'id' });

          await db.from('leads').upsert(window.leads.map(l => ({
            id:l.id, name:l.name, company:l.company||'', stage:l.stage,
            value:l.value||0, owner:l.owner||'', last_contact:l.lastContact||null,
            next_action:l.nextAction||'', status:l.status||'Active'
          })), { onConflict: 'id' });

          await db.from('client_pos').upsert(window.clientPOs.map(p => ({
            id:p.id, po_number:p.num, client_name:p.client, date:p.date||null,
            status:p.status, terms:p.terms||'', delivery:p.delivery||null,
            prod_total:p.prodTotal||0, svc_total:p.svcTotal||0, total_amount:p.total||0
          })), { onConflict: 'id' });

          await db.from('supplier_pos').upsert(window.supplierPOs.map(s => ({
            id:s.id, po_number:s.num, supplier_name:s.supplier,
            linked_cpo:s.linked||null, date:s.date||null, delivery:s.delivery||null,
            status:s.status, lines:s.lines||[{type:'product'}],
            total_amount:s.total||0, paid:s.paid||0, balance:s.balance||0
          })), { onConflict: 'id' });

          await db.from('invoices').upsert(window.invoices.map(i => ({
            id:i.id, invoice_number:i.num, client_name:i.client,
            po_ref:i.poRef||null, date:i.date||null, due_date:i.due||null,
            terms:i.terms||'', total_amount:i.amount||0,
            amount_paid:i.paid||0, status:i.status
          })), { onConflict: 'id' });

          await db.from('expenses').upsert(window.expenses.map(e => ({
            id:e.id, ref:e.ref, date:e.date||null, month:e.month||'',
            category:e.cat||'', description:e.desc||'', payee:e.payee||'',
            amount:e.amount||0, payment_mode:e.mode||'', status:e.status||'Approved'
          })), { onConflict: 'id' });

          hideLoader();
          showToast('✅ Sample data saved to Supabase!', '#16a34a');

        } else {
          await loadAllData();
        }
      } catch (err) {
        hideLoader();
        console.error('Init error:', err);
        showToast('⚠️ DB init failed: ' + err.message, '#dc2626');
      }
    }

    init();

  }); // end window.load

})();
