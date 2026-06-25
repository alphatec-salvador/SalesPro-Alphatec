// SalesOps Pro — Fix File v1.2
// Save this file as salesops_fix.js in the SAME folder as your HTML file
// Then add this line just before </body> in your HTML:
// <script src="salesops_fix.js"></script>

window.addEventListener('load', function() {

  var currentViewId = null;

  // Fix print overlay
  window.closePrintDoc = function() {
    document.getElementById('printDocWrap').style.display = 'none';
  };

  function showPrint() {
    var w = document.getElementById('printDocWrap');
    w.style.display = 'block';
    w.scrollTop = 0;
  }

  // Patch printInvoice
  var _pi = window.printInvoice;
  window.printInvoice = function(id) { _pi(id); showPrint(); };

  // Patch printSupplierPO
  var _ps = window.printSupplierPO;
  window.printSupplierPO = function(id) { _ps(id); showPrint(); };

  // printInvoiceFromCPO
  window.printInvoiceFromCPO = function(cpoId) {
    var cpo = clientPOs.find(function(p) { return p.id === cpoId; });
    if (!cpo) return;
    var inv = invoices.find(function(i) { return i.poRef === cpo.num; });
    if (inv) { window.printInvoice(inv.id); return; }
    document.getElementById('printDocContent').innerHTML =
      '<div class="print-doc">' +
        '<div class="doc-header">' +
          '<div class="doc-company"><h2>' + company.name + '</h2><p>' + company.tagline + '</p><p>' + company.addr + '</p></div>' +
          '<div class="doc-meta"><h3 style="color:#d97706">DRAFT INVOICE</h3><p style="font-weight:700">' + cpo.num + '</p><p>Date: ' + (cpo.date||'—') + '</p></div>' +
        '</div>' +
        '<div class="doc-parties">' +
          '<div class="doc-party"><h4>Bill To</h4><p style="font-weight:700">' + cpo.client + '</p><p>Terms: ' + cpo.terms + '</p></div>' +
          '<div class="doc-party"><h4>Reference</h4><p>CPO: <strong>' + cpo.num + '</strong></p><p>Status: ' + cpo.status + '</p></div>' +
        '</div>' +
        '<table class="doc-table"><thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>' +
        '<tbody>' +
          '<tr><td>Product Sales</td><td style="text-align:right">₱' + cpo.prodTotal.toLocaleString() + '</td></tr>' +
          '<tr><td>Service Revenue</td><td style="text-align:right">₱' + cpo.svcTotal.toLocaleString() + '</td></tr>' +
        '</tbody></table>' +
        '<div class="doc-total-box"><div class="total-row grand"><span>TOTAL DUE</span><span>₱' + cpo.total.toLocaleString() + '</span></div></div>' +
        '<div class="doc-footer">' + company.name + ' · Draft — create a formal invoice to finalize</div>' +
      '</div>';
    showPrint();
  };

  // viewCPO
  window.viewCPO = function(id) {
    currentViewId = id;
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
        '<div class="fg"><label>Status</label><div style="margin-top:6px"><span class="badge ' + (sbMap[p.status]||'bgr') + '">' + p.status + '</span></div></div>' +
        '<div class="fg"><label>Terms</label><input class="fc" value="' + (p.terms||'—') + '" readonly style="background:#f1f5f9"/></div>' +
        '<div class="fg"><label>Delivery</label><input class="fc" value="' + (p.delivery||'—') + '" readonly style="background:#f1f5f9"/></div>' +
      '</div>' +
      '<div style="background:#f8fafc;border-radius:8px;padding:14px;margin-bottom:14px">' +
        '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">' +
          '<div style="text-align:center;padding:10px;background:#eff6ff;border-radius:8px"><div style="font-size:.65rem;color:#94a3b8;margin-bottom:4px">Products</div><div style="font-weight:700;color:#1d4ed8">₱' + p.prodTotal.toLocaleString() + '</div></div>' +
          '<div style="text-align:center;padding:10px;background:#faf5ff;border-radius:8px"><div style="font-size:.65rem;color:#94a3b8;margin-bottom:4px">Services</div><div style="font-weight:700;color:#7c3aed">₱' + p.svcTotal.toLocaleString() + '</div></div>' +
          '<div style="text-align:center;padding:10px;background:#eff6ff;border-radius:8px"><div style="font-size:.65rem;color:#94a3b8;margin-bottom:4px">Total</div><div style="font-weight:700;color:#1d4ed8">₱' + p.total.toLocaleString() + '</div></div>' +
          '<div style="text-align:center;padding:10px;background:' + (jgp>=0?'#f0fdf4':'#fef2f2') + ';border-radius:8px"><div style="font-size:.65rem;color:#94a3b8;margin-bottom:4px">Job GP</div><div style="font-weight:700;color:' + (jgp>=0?'#16a34a':'#dc2626') + '">₱' + jgp.toLocaleString() + ' (' + pct + '%)</div></div>' +
        '</div>' +
      '</div>' +
      '<div style="font-size:.72rem;font-weight:700;color:#374151;margin-bottom:8px">Linked Supplier POs (' + ls.length + ')</div>' +
      (ls.length ? ls.map(function(sp) {
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 12px;background:#fff;border:1px solid #e2e8f0;border-radius:7px;margin-bottom:6px;font-size:.8rem;gap:8px">' +
          '<span class="badge bt">' + sp.num + '</span>' +
          '<span style="flex:1">' + sp.supplier + '</span>' +
          '<span class="badge ' + (sbMap[sp.status]||'bgr') + '">' + sp.status + '</span>' +
          '<span style="font-weight:700;color:#d97706">₱' + sp.total.toLocaleString() + '</span>' +
        '</div>';
      }).join('') : '<p style="color:#94a3b8;font-size:.8rem;padding:8px">No linked SPOs yet.</p>');
    openModal('mViewCPO');
  };

  // editCPO
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

  // viewSPO
  window.viewSPO = function(id) {
    currentViewId = id;
    var s = supplierPOs.find(function(x) { return x.id === id; }); if (!s) return;
    var cpo = clientPOs.find(function(p) { return p.num === s.linked; });
    document.getElementById('vSPOTitle').textContent = s.num + ' — ' + s.supplier;
    document.getElementById('vSPOSub').textContent = 'Date: ' + (s.date||'—') + '  ·  Status: ' + s.status;
    document.getElementById('vSPOBody').innerHTML =
      '<div class="g3" style="margin-bottom:14px">' +
        '<div class="fg"><label>PO Number</label><input class="fc" value="' + s.num + '" readonly style="background:#f1f5f9;font-weight:700;color:#d97706"/></div>' +
        '<div class="fg"><label>Supplier</label><input class="fc" value="' + s.supplier + '" readonly style="background:#f1f5f9"/></div>' +
        '<div class="fg"><label>Date</label><input class="fc" value="' + (s.date||'—') + '" readonly style="background:#f1f5f9"/></div>' +
        '<div class="fg"><label>Status</label><div style="margin-top:6px"><span class="badge ' + (sbMap[s.status]||'bgr') + '">' + s.status + '</span></div></div>' +
        '<div class="fg"><label>Linked CPO</label><div style="margin-top:6px">' + (s.linked ? '<span class="badge bb">' + s.linked + '</span>' : '<span style="color:#94a3b8">None</span>') + '</div></div>' +
        '<div class="fg"><label>Delivery</label><input class="fc" value="' + (s.delivery||'—') + '" readonly style="background:#f1f5f9"/></div>' +
      '</div>' +
      '<div style="background:#fffbeb;border-radius:8px;padding:14px;margin-bottom:14px">' +
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;text-align:center">' +
          '<div style="padding:10px;background:#fff7ed;border-radius:8px"><div style="font-size:.65rem;color:#94a3b8;margin-bottom:4px">Total COGS</div><div style="font-weight:700;color:#d97706">₱' + s.total.toLocaleString() + '</div></div>' +
          '<div style="padding:10px;background:#f0fdf4;border-radius:8px"><div style="font-size:.65rem;color:#94a3b8;margin-bottom:4px">Paid</div><div style="font-weight:700;color:#16a34a">₱' + s.paid.toLocaleString() + '</div></div>' +
          '<div style="padding:10px;background:' + (s.balance>0?'#fef2f2':'#f0fdf4') + ';border-radius:8px"><div style="font-size:.65rem;color:#94a3b8;margin-bottom:4px">Balance</div><div style="font-weight:700;color:' + (s.balance>0?'#dc2626':'#16a34a') + '">₱' + s.balance.toLocaleString() + '</div></div>' +
        '</div>' +
      '</div>' +
      (cpo ? '<div style="background:#eff6ff;border-radius:8px;padding:12px;font-size:.8rem;border:1px solid #bfdbfe"><strong>Linked CPO:</strong> ' + cpo.num + ' · ' + cpo.client + ' · Revenue: ₱' + cpo.total.toLocaleString() + '</div>' : '');
    openModal('mViewSPO');
  };

  // editSPO
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

  // viewInv
  window.viewInv = function(id) {
    currentViewId = id;
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
          '<div style="padding:10px;background:#eff6ff;border-radius:8px"><div style="font-size:.65rem;color:#94a3b8;margin-bottom:4px">Amount</div><div style="font-weight:700;color:#1d4ed8">₱' + inv.amount.toLocaleString() + '</div></div>' +
          '<div style="padding:10px;background:#f0fdf4;border-radius:8px"><div style="font-size:.65rem;color:#94a3b8;margin-bottom:4px">Paid</div><div style="font-weight:700;color:#16a34a">₱' + inv.paid.toLocaleString() + '</div></div>' +
          '<div style="padding:10px;background:' + (inv.balance>0?'#fef2f2':'#f0fdf4') + ';border-radius:8px"><div style="font-size:.65rem;color:#94a3b8;margin-bottom:4px">Balance Due</div><div style="font-weight:700;color:' + (inv.balance>0?'#dc2626':'#16a34a') + '">₱' + inv.balance.toLocaleString() + '</div></div>' +
        '</div>' +
      '</div>' +
      '<div style="text-align:center"><span class="badge ' + (sbMap[inv.status]||'bgr') + '" style="font-size:.82rem;padding:6px 20px">' + inv.status + '</span></div>';
    openModal('mViewInv');
  };

  // editInv
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

  // Patch renderInv to add View + Edit buttons
  window.renderInv = function() {
    var s = (document.getElementById('iSrch').value || '').toLowerCase();
    var st = document.getElementById('iStF').value;
    var f = invoices.filter(function(i) {
      return (!s || (i.num + i.client).toLowerCase().includes(s)) && (!st || i.status === st);
    });
    document.getElementById('invTbl').innerHTML = f.length ? f.map(function(i) {
      return '<tr>' +
        '<td style="font-weight:600;color:#1d4ed8">' + i.num + '</td>' +
        '<td>' + (i.poRef ? '<span class="badge bb">' + i.poRef + '</span>' : '—') + '</td>' +
        '<td>' + i.client + '</td>' +
        '<td>' + (i.date||'—') + '</td>' +
        '<td>' + (i.due||'—') + '</td>' +
        '<td style="font-size:.75rem;color:#64748b">' + (i.terms||'—') + '</td>' +
        '<td style="font-weight:600">₱' + i.amount.toLocaleString() + '</td>' +
        '<td style="color:#16a34a">₱' + i.paid.toLocaleString() + '</td>' +
        '<td style="color:' + (i.balance>0?'#dc2626':'#16a34a') + ';font-weight:600">₱' + i.balance.toLocaleString() + '</td>' +
        '<td><span class="badge ' + (sbMap[i.status]||'bgr') + '">' + i.status + '</span></td>' +
        '<td style="display:flex;gap:4px;white-space:nowrap">' +
          '<button class="btn btn-ghost btn-sm" onclick="viewInv(' + i.id + ')">👁 View</button>' +
          '<button class="btn btn-ghost btn-sm" onclick="editInv(' + i.id + ')">✏️</button>' +
          '<button class="btn btn-ghost btn-sm" onclick="printInvoice(' + i.id + ')">🖨️</button>' +
          '<button class="btn btn-danger" onclick="invoices=invoices.filter(x=>x.id!=' + i.id + ');renderInv()">✕</button>' +
        '</td>' +
      '</tr>';
    }).join('') : '<tr><td colspan="11" style="text-align:center;color:#94a3b8;padding:24px">No invoices.</td></tr>';
    document.getElementById('iFА').textContent = '₱' + f.reduce(function(a,i){return a+i.amount;},0).toLocaleString();
    document.getElementById('iFP').textContent = '₱' + f.reduce(function(a,i){return a+i.paid;},0).toLocaleString();
    document.getElementById('iFB').textContent = '₱' + f.reduce(function(a,i){return a+i.balance;},0).toLocaleString();
  };

  // Re-render invoices immediately so buttons appear
  if (document.getElementById('invTbl')) renderInv();

});
