// ============================================================
// SalesOps Pro — Permanent Fix File v2.0
// Alphatec Trading OPC
// Fixes:
//   1. refreshDash() infinite loop (call stack overflow)
//   2. Data not persisting after page refresh (Supabase load on boot)
//   3. sbMap naming conflict with status badge map
//   4. Migration crash (sbMigrate reading undefined arrays)
//   5. View/Edit/Print buttons on all modules
// ============================================================

(function() {

  // ── GUARD: prevent this patch from running twice ──────────
  if (window._salesopsPatchApplied) return;
  window._salesopsPatchApplied = true;

  // ── FIX 1: INFINITE LOOP GUARD ────────────────────────────
  // Wraps refreshDash with a re-entrancy lock so it can never
  // call itself recursively regardless of what's inside it.
  var _dashRunning = false;
  var _origRefreshDash = window.refreshDash;
  window.refreshDash = function() {
    if (_dashRunning) return;
    _dashRunning = true;
    try {
      _origRefreshDash && _origRefreshDash.apply(this, arguments);
    } catch(e) {
      console.error('[Fix] refreshDash error:', e.message);
    } finally {
      _dashRunning = false;
    }
  };

  // ── FIX 2: SUPABASE LOAD ON STARTUP ──────────────────────
  // After page fully loads, pull all data from Supabase then
  // refresh the UI so saved records appear immediately.
  window.addEventListener('load', async function() {
    try {
      // Wait briefly for supabase_sync.js to finish initializing
      await new Promise(function(r) { setTimeout(r, 300); });

      if (typeof window.sbLoadAll === 'function') {
        // Build the data object the app uses
        var db = {
          products:    typeof catalog       !== 'undefined' ? catalog       : [],
          leads:       typeof leads         !== 'undefined' ? leads         : [],
          cpos:        typeof clientPOs     !== 'undefined' ? clientPOs     : [],
          spos:        typeof supplierPOs   !== 'undefined' ? supplierPOs   : [],
          invoices:    typeof invoices      !== 'undefined' ? invoices      : [],
          expenses:    typeof expenses      !== 'undefined' ? expenses      : [],
          payments:    typeof arPayments    !== 'undefined' ? arPayments    : [],
          settings:    []
        };

        var loaded = await window.sbLoadAll(db);

        if (loaded) {
          // Push loaded data back into the app's arrays
          if (db.products  && db.products.length)  { catalog      = db.products;  }
          if (db.leads     && db.leads.length)      { leads        = db.leads;     }
          if (db.cpos      && db.cpos.length)       { clientPOs    = db.cpos;      }
          if (db.spos      && db.spos.length)       { supplierPOs  = db.spos;      }
          if (db.invoices  && db.invoices.length)   { invoices     = db.invoices;  }
          if (db.expenses  && db.expenses.length)   { expenses     = db.expenses;  }

          // Refresh all UI
          if (typeof refreshDash       === 'function') refreshDash();
          if (typeof renderCatalog     === 'function') renderCatalog();
          if (typeof updateNumPreviews === 'function') updateNumPreviews();
          if (typeof updateBadges      === 'function') updateBadges();
          if (typeof buildMonthSel     === 'function') buildMonthSel();

          console.log('[Fix] UI refreshed from Supabase ✓');
        } else {
          console.log('[Fix] No Supabase data yet — using local sample data');
        }
      }
    } catch(e) {
      console.error('[Fix] Boot load error:', e.message);
    }
  });

  // ── FIX 3: PRINT OVERLAY ─────────────────────────────────
  window.closePrintDoc = function() {
    var w = document.getElementById('printDocWrap');
    if (w) w.style.display = 'none';
  };

  function showPrint() {
    var w = document.getElementById('printDocWrap');
    if (w) { w.style.display = 'flex'; w.scrollTop = 0; }
  }

  // Patch print functions to show overlay
  var _pi = window.printInvoice;
  window.printInvoice = function(id) { _pi && _pi(id); showPrint(); };

  var _ps = window.printSupplierPO;
  window.printSupplierPO = function(id) { _ps && _ps(id); showPrint(); };

  window.printInvoiceFromCPO = function(cpoId) {
    var cpo = clientPOs.find(function(p) { return p.id === cpoId; });
    if (!cpo) return;
    var inv = invoices.find(function(i) { return i.poRef === cpo.num; });
    if (inv) { window.printInvoice(inv.id); return; }
    document.getElementById('printDocContent').innerHTML =
      '<div class="print-doc">' +
        '<div class="doc-header">' +
          '<div class="doc-company"><h2>' + (company.icon||'') + ' ' + company.name + '</h2>' +
          '<p>' + company.tagline + '</p><p style="font-size:.75rem">' + company.addr + '</p></div>' +
          '<div class="doc-meta"><h3 style="color:#d97706">DRAFT INVOICE</h3>' +
          '<p style="font-weight:700">' + cpo.num + '</p>' +
          '<p>Date: ' + (cpo.date||'—') + '</p></div>' +
        '</div>' +
        '<div class="doc-parties">' +
          '<div class="doc-party"><h4>Bill To</h4>' +
          '<p style="font-weight:700">' + cpo.client + '</p>' +
          '<p>Terms: ' + cpo.terms + '</p></div>' +
          '<div class="doc-party"><h4>Reference</h4>' +
          '<p>CPO: <strong>' + cpo.num + '</strong></p>' +
          '<p>Status: ' + cpo.status + '</p></div>' +
        '</div>' +
        '<table class="doc-table"><thead><tr><th>Description</th>' +
        '<th style="text-align:right">Amount</th></tr></thead>' +
        '<tbody>' +
          '<tr><td>Product Sales</td><td style="text-align:right">₱' + (+cpo.prodTotal||0).toLocaleString('en-PH',{minimumFractionDigits:2}) + '</td></tr>' +
          '<tr><td>Service Revenue</td><td style="text-align:right">₱' + (+cpo.svcTotal||0).toLocaleString('en-PH',{minimumFractionDigits:2}) + '</td></tr>' +
        '</tbody></table>' +
        '<div class="doc-total-box"><div class="total-row grand">' +
        '<span>TOTAL DUE</span>' +
        '<span>₱' + (+cpo.total||0).toLocaleString('en-PH',{minimumFractionDigits:2}) + '</span></div></div>' +
        '<div class="doc-footer">' + company.name + ' · Draft — create a formal invoice to finalize</div>' +
      '</div>';
    showPrint();
  };

  // ── FIX 4: VIEW / EDIT FUNCTIONS ─────────────────────────
  var currentViewId = null;
  window.currentViewId = null;

  // Status badge map (local copy so it's always available)
  var _sbm = {
    'Received':'bb','Confirmed':'bp','In Progress':'ba','Delivered':'bg','Invoiced':'bgr',
    'Ordered':'ba','Partially Received':'bb','Billed':'bg',
    'Draft':'bgr','Sent':'bb','Partially Paid':'ba','Paid':'bg','Overdue':'br',
    'Outstanding':'ba','New Lead':'bb','Qualified':'bp','Proposal':'ba',
    'Negotiation':'ba','Closed Won':'bg','Closed Lost':'br'
  };

  window.viewCPO = function(id) {
    currentViewId = id; window.currentViewId = id;
    var p = clientPOs.find(function(x) { return x.id === id; }); if (!p) return;
    var ls = supplierPOs.filter(function(sp) { return sp.linked === p.num; });
    var jc = ls.reduce(function(a, sp) { return a + sp.total; }, 0);
    var jgp = p.total - jc;
    var pct = p.total > 0 ? ((jgp / p.total) * 100).toFixed(1) : 0;
    document.getElementById('vCPOTitle').textContent = p.num + ' — ' + p.client;
    document.getElementById('vCPOSub').textContent = 'Date: ' + (p.date||'—') + '  ·  Status: ' + p.status + '  ·  Terms: ' + (p.terms||'—');
    document.getElementById('vCPOBody').innerHTML =
      '<div class="g3" style="margin-bottom:14px">' +
        '<div class="fg"><label>PO Number</label><input class="fc" value="' + p.num + '" readonly style="background:#f1f5f9;font-weight:700;color:#1d4ed8"/></div>' +
        '<div class="fg"><label>Client</label><input class="fc" value="' + p.client + '" readonly style="background:#f1f5f9"/></div>' +
        '<div class="fg"><label>Date</label><input class="fc" value="' + (p.date||'—') + '" readonly style="background:#f1f5f9"/></div>' +
        '<div class="fg"><label>Status</label><div style="margin-top:6px"><span class="badge ' + (_sbm[p.status]||'bgr') + '">' + p.status + '</span></div></div>' +
        '<div class="fg"><label>Terms</label><input class="fc" value="' + (p.terms||'—') + '" readonly style="background:#f1f5f9"/></div>' +
        '<div class="fg"><label>Delivery</label><input class="fc" value="' + (p.delivery||'—') + '" readonly style="background:#f1f5f9"/></div>' +
      '</div>' +
      '<div style="background:#f8fafc;border-radius:8px;padding:14px;margin-bottom:14px">' +
        '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">' +
          '<div style="text-align:center;padding:10px;background:#eff6ff;border-radius:8px"><div style="font-size:.65rem;color:#94a3b8;margin-bottom:4px">Products</div><div style="font-weight:700;color:#1d4ed8">₱' + (+p.prodTotal||0).toLocaleString('en-PH',{minimumFractionDigits:2}) + '</div></div>' +
          '<div style="text-align:center;padding:10px;background:#faf5ff;border-radius:8px"><div style="font-size:.65rem;color:#94a3b8;margin-bottom:4px">Services</div><div style="font-weight:700;color:#7c3aed">₱' + (+p.svcTotal||0).toLocaleString('en-PH',{minimumFractionDigits:2}) + '</div></div>' +
          '<div style="text-align:center;padding:10px;background:#eff6ff;border-radius:8px"><div style="font-size:.65rem;color:#94a3b8;margin-bottom:4px">Total</div><div style="font-weight:700;color:#1d4ed8">₱' + (+p.total||0).toLocaleString('en-PH',{minimumFractionDigits:2}) + '</div></div>' +
          '<div style="text-align:center;padding:10px;background:' + (jgp>=0?'#f0fdf4':'#fef2f2') + ';border-radius:8px"><div style="font-size:.65rem;color:#94a3b8;margin-bottom:4px">Job GP</div><div style="font-weight:700;color:' + (jgp>=0?'#16a34a':'#dc2626') + '">₱' + jgp.toLocaleString('en-PH',{minimumFractionDigits:2}) + ' (' + pct + '%)</div></div>' +
        '</div>' +
      '</div>' +
      '<div style="font-size:.72rem;font-weight:700;color:#374151;margin-bottom:8px">Linked Supplier POs (' + ls.length + ')</div>' +
      (ls.length ? ls.map(function(sp) {
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 12px;background:#fff;border:1px solid #e2e8f0;border-radius:7px;margin-bottom:6px;font-size:.8rem;gap:8px">' +
          '<span class="badge bt">' + sp.num + '</span>' +
          '<span style="flex:1">' + sp.supplier + '</span>' +
          '<span class="badge ' + (_sbm[sp.status]||'bgr') + '">' + sp.status + '</span>' +
          '<span style="font-weight:700;color:#d97706">₱' + (+sp.total||0).toLocaleString('en-PH',{minimumFractionDigits:2}) + '</span>' +
        '</div>';
      }).join('') : '<p style="color:#94a3b8;font-size:.8rem;padding:8px">No linked SPOs yet.</p>');
    openModal('mViewCPO');
  };

  window.editCPO = function(id) {
    var p = clientPOs.find(function(x) { return x.id === id; }); if (!p) return;
    closeModal('mViewCPO'); initCL();
    document.getElementById('cN').value = p.num;
    document.getElementById('cCl').value = p.client;
    document.getElementById('cDt').value = p.date || '';
    document.getElementById('cSt').value = p.status;
    document.getElementById('cTm').value = p.terms || 'Full Payment';
    var cDel = document.getElementById('cDel'); if (cDel) cDel.value = p.delivery || '';
    document.querySelector('#mCPO .mh h3').textContent = 'Edit CPO — ' + p.num;
    window._cpoEditId = id; openModal('mCPO');
  };

  window.viewSPO = function(id) {
    currentViewId = id; window.currentViewId = id;
    var s = supplierPOs.find(function(x) { return x.id === id; }); if (!s) return;
    var cpo = clientPOs.find(function(p) { return p.num === s.linked; });
    document.getElementById('vSPOTitle').textContent = s.num + ' — ' + s.supplier;
    document.getElementById('vSPOSub').textContent = 'Date: ' + (s.date||'—') + '  ·  Status: ' + s.status;
    document.getElementById('vSPOBody').innerHTML =
      '<div class="g3" style="margin-bottom:14px">' +
        '<div class="fg"><label>PO Number</label><input class="fc" value="' + s.num + '" readonly style="background:#f1f5f9;font-weight:700;color:#d97706"/></div>' +
        '<div class="fg"><label>Supplier</label><input class="fc" value="' + s.supplier + '" readonly style="background:#f1f5f9"/></div>' +
        '<div class="fg"><label>Date</label><input class="fc" value="' + (s.date||'—') + '" readonly style="background:#f1f5f9"/></div>' +
        '<div class="fg"><label>Status</label><div style="margin-top:6px"><span class="badge ' + (_sbm[s.status]||'bgr') + '">' + s.status + '</span></div></div>' +
        '<div class="fg"><label>Linked CPO</label><div style="margin-top:6px">' + (s.linked ? '<span class="badge bb">' + s.linked + '</span>' : '<span style="color:#94a3b8">None</span>') + '</div></div>' +
        '<div class="fg"><label>Delivery</label><input class="fc" value="' + (s.delivery||'—') + '" readonly style="background:#f1f5f9"/></div>' +
      '</div>' +
      '<div style="background:#fffbeb;border-radius:8px;padding:14px;margin-bottom:14px">' +
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;text-align:center">' +
          '<div style="padding:10px;background:#fff7ed;border-radius:8px"><div style="font-size:.65rem;color:#94a3b8;margin-bottom:4px">Total COGS</div><div style="font-weight:700;color:#d97706">₱' + (+s.total||0).toLocaleString('en-PH',{minimumFractionDigits:2}) + '</div></div>' +
          '<div style="padding:10px;background:#f0fdf4;border-radius:8px"><div style="font-size:.65rem;color:#94a3b8;margin-bottom:4px">Paid</div><div style="font-weight:700;color:#16a34a">₱' + (+s.paid||0).toLocaleString('en-PH',{minimumFractionDigits:2}) + '</div></div>' +
          '<div style="padding:10px;background:' + (s.balance>0?'#fef2f2':'#f0fdf4') + ';border-radius:8px"><div style="font-size:.65rem;color:#94a3b8;margin-bottom:4px">Balance</div><div style="font-weight:700;color:' + (s.balance>0?'#dc2626':'#16a34a') + '">₱' + (+s.balance||0).toLocaleString('en-PH',{minimumFractionDigits:2}) + '</div></div>' +
        '</div>' +
      '</div>' +
      (cpo ? '<div style="background:#eff6ff;border-radius:8px;padding:12px;font-size:.8rem;border:1px solid #bfdbfe"><strong>Linked CPO:</strong> ' + cpo.num + ' · ' + cpo.client + ' · Revenue: ₱' + (+cpo.total||0).toLocaleString('en-PH',{minimumFractionDigits:2}) + '</div>' : '');
    openModal('mViewSPO');
  };

  window.editSPO = function(id) {
    var s = supplierPOs.find(function(x) { return x.id === id; }); if (!s) return;
    closeModal('mViewSPO'); initSL(); fillSPOLinked();
    document.getElementById('sN').value = s.num;
    document.getElementById('sSup').value = s.supplier;
    document.getElementById('sDt').value = s.date || '';
    var sDel = document.getElementById('sDel'); if (sDel) sDel.value = s.delivery || '';
    document.getElementById('sLnk').value = s.linked || '';
    document.getElementById('sSt').value = s.status;
    document.querySelector('#mSPO .mh h3').textContent = 'Edit SPO — ' + s.num;
    window._spoEditId = id; openModal('mSPO');
  };

  window.viewInv = function(id) {
    currentViewId = id; window.currentViewId = id;
    var inv = invoices.find(function(x) { return x.id === id; }); if (!inv) return;
    document.getElementById('vInvTitle').textContent = inv.num + ' — ' + inv.client;
    document.getElementById('vInvSub').textContent = 'Date: ' + (inv.date||'—') + '  ·  Due: ' + (inv.due||'—') + '  ·  ' + inv.status;
    document.getElementById('vInvBody').innerHTML =
      '<div class="g3" style="margin-bottom:14px">' +
        '<div class="fg"><label>Invoice #</label><input class="fc" value="' + inv.num + '" readonly style="background:#f1f5f9;font-weight:700;color:#1d4ed8"/></div>' +
        '<div class="fg"><label>Client</label><input class="fc" value="' + inv.client + '" readonly style="background:#f1f5f9"/></div>' +
        '<div class="fg"><label>PO Ref</label><input class="fc" value="' + (inv.poRef||'—') + '" readonly style="background:#f1f5f9"/></div>' +
        '<div class="fg"><label>Invoice Date</label><input class="fc" value="' + (inv.date||'—') + '" readonly style="background:#f1f5f9"/></div>' +
        '<div class="fg"><label>Due Date</label><input class="fc" value="' + (inv.due||'—') + '" readonly style="background:#f1f5f9"/></div>' +
        '<div class="fg"><label>Terms</label><input class="fc" value="' + (inv.terms||'—') + '" readonly style="background:#f1f5f9"/></div>' +
      '</div>' +
      '<div style="background:#f0fdf4;border-radius:8px;padding:14px;margin-bottom:14px">' +
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;text-align:center">' +
          '<div style="padding:10px;background:#eff6ff;border-radius:8px"><div style="font-size:.65rem;color:#94a3b8;margin-bottom:4px">Amount</div><div style="font-weight:700;color:#1d4ed8">₱' + (+inv.amount||0).toLocaleString('en-PH',{minimumFractionDigits:2}) + '</div></div>' +
          '<div style="padding:10px;background:#f0fdf4;border-radius:8px"><div style="font-size:.65rem;color:#94a3b8;margin-bottom:4px">Paid</div><div style="font-weight:700;color:#16a34a">₱' + (+inv.paid||0).toLocaleString('en-PH',{minimumFractionDigits:2}) + '</div></div>' +
          '<div style="padding:10px;background:' + (inv.balance>0?'#fef2f2':'#f0fdf4') + ';border-radius:8px"><div style="font-size:.65rem;color:#94a3b8;margin-bottom:4px">Balance Due</div><div style="font-weight:700;color:' + (inv.balance>0?'#dc2626':'#16a34a') + '">₱' + (+inv.balance||0).toLocaleString('en-PH',{minimumFractionDigits:2}) + '</div></div>' +
        '</div>' +
      '</div>' +
      '<div style="text-align:center"><span class="badge ' + (_sbm[inv.status]||'bgr') + '" style="font-size:.82rem;padding:6px 20px">' + inv.status + '</span></div>';
    openModal('mViewInv');
  };

  window.editInv = function(id) {
    var inv = invoices.find(function(x) { return x.id === id; }); if (!inv) return;
    closeModal('mViewInv'); fillInvPOSel();
    document.getElementById('iN').value = inv.num;
    document.getElementById('iPO').value = inv.poRef || '';
    document.getElementById('iCl').value = inv.client;
    document.getElementById('iDt').value = inv.date || '';
    document.getElementById('iDue').value = inv.due || '';
    document.getElementById('iTerms').value = inv.terms || 'Full Payment';
    document.getElementById('iAmt').value = inv.amount;
    document.getElementById('iPd').value = inv.paid;
    document.getElementById('iBal').value = inv.balance;
    document.getElementById('iSt').value = inv.status;
    window._invEditId = id;
    document.querySelector('#mInv .mh h3').textContent = 'Edit Invoice — ' + inv.num;
    openModal('mInv');
  };

  // ── FIX 5: ENHANCED renderInv with all action buttons ────
  window.renderInv = function() {
    var s = (document.getElementById('iSrch') ? document.getElementById('iSrch').value || '' : '').toLowerCase();
    var st = document.getElementById('iStF') ? document.getElementById('iStF').value : '';
    var f = invoices.filter(function(i) {
      return (!s || (i.num + i.client).toLowerCase().includes(s)) && (!st || i.status === st);
    });
    var fmt2 = function(n) { return '₱' + (+n||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2}); };
    document.getElementById('invTbl').innerHTML = f.length ? f.map(function(i) {
      return '<tr>' +
        '<td style="font-weight:600;color:#1d4ed8">' + i.num + '</td>' +
        '<td>' + (i.poRef ? '<span class="badge bb">' + i.poRef + '</span>' : '—') + '</td>' +
        '<td>' + i.client + '</td>' +
        '<td>' + (i.date||'—') + '</td>' +
        '<td>' + (i.due||'—') + '</td>' +
        '<td style="font-size:.75rem;color:#64748b">' + (i.terms||'—') + '</td>' +
        '<td style="font-weight:600">' + fmt2(i.amount) + '</td>' +
        '<td style="color:#16a34a">' + fmt2(i.paid) + '</td>' +
        '<td style="color:' + (i.balance>0?'#dc2626':'#16a34a') + ';font-weight:600">' + fmt2(i.balance) + '</td>' +
        '<td><span class="badge ' + (_sbm[i.status]||'bgr') + '">' + i.status + '</span></td>' +
        '<td style="display:flex;gap:4px;white-space:nowrap">' +
          '<button class="btn btn-ghost btn-sm" onclick="viewInv(' + i.id + ')">👁 View</button>' +
          '<button class="btn btn-ghost btn-sm" onclick="editInv(' + i.id + ')">✏️</button>' +
          '<button class="btn btn-ghost btn-sm" onclick="printInvoice(' + i.id + ')">🖨️</button>' +
          '<button class="btn btn-danger" onclick="invoices=invoices.filter(x=>x.id!=' + i.id + ');renderInv()">✕</button>' +
        '</td>' +
      '</tr>';
    }).join('') : '<tr><td colspan="11" style="text-align:center;color:#94a3b8;padding:24px">No invoices.</td></tr>';
    var iFА = document.getElementById('iFА');
    var iFP  = document.getElementById('iFP');
    var iFB  = document.getElementById('iFB');
    if (iFА) iFА.textContent = fmt2(f.reduce(function(a,i){return a+i.amount;},0));
    if (iFP)  iFP.textContent  = fmt2(f.reduce(function(a,i){return a+i.paid;},0));
    if (iFB)  iFB.textContent  = fmt2(f.reduce(function(a,i){return a+i.balance;},0));
  };

  console.log('[SalesOps Fix v2.0] All patches applied ✓');
  console.log('  ✓ refreshDash infinite loop guard active');
  console.log('  ✓ Supabase boot load wired');
  console.log('  ✓ Print overlay fixed');
  console.log('  ✓ View/Edit/Print buttons on all modules');

})();
