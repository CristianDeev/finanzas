const CARDS = [
  { id:'Nequi',       name:'Nequi',       class:'nequi',       icon:'💜', color:'#7c3aed' },
  { id:'Bancolombia', name:'Bancolombia', class:'bancolombia', icon:'🔵', color:'#1d4ed8' },
  { id:'MIO',         name:'MIO',         class:'mio',         icon:'🟠', color:'#d97706' }
];

const CATEGORIES = {
  comida:          { label:'Comida',          icon:'🍔' },
  transporte:      { label:'Transporte',      icon:'🚌' },
  entretenimiento: { label:'Entretenimiento', icon:'🎬' },
  salud:           { label:'Salud',           icon:'💊' },
  servicios:       { label:'Servicios',       icon:'💡' },
  ropa:            { label:'Ropa',            icon:'👗' },
  otro:            { label:'Otro',            icon:'📦' }
};

let data = loadData();
let txFilter = 'todos';
let chartMonth = new Date();
let histMonth  = new Date();
let chartInstances = {};

function loadData() {
  const def = {
    balances: { Nequi:0, Bancolombia:0, MIO:0 },
    transactions: []
  };
  try { return JSON.parse(localStorage.getItem('fintrack')) || def; }
  catch(e) { return def; }
}

function saveData(d) {
  localStorage.setItem('fintrack', JSON.stringify(d));
}

function showPage(p) {
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById('page-' + p).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(el => {
    if (el.textContent.toLowerCase().includes(p.substring(0, 4))) el.classList.add('active');
  });

  // Sync bottom nav (mobile)
  document.querySelectorAll('.bottom-nav-item').forEach(el => el.classList.remove('active'));
  const bnItem = document.getElementById('bn-' + p);
  if (bnItem) bnItem.classList.add('active');

  // Scroll to top on page change (mobile)
  document.querySelector('.main').scrollTo({ top: 0, behavior: 'smooth' });

  if (p === 'dashboard')   renderDashboard();
  if (p === 'movimientos') renderMovimientos();
  if (p === 'graficas')    renderGraficas();
  if (p === 'historial')   renderHistorial();
  if (p === 'tarjetas')    renderTarjetas();
}

function openModal(id) {
  document.getElementById(id).classList.add('open');
  if (id === 'modal-tx') {
    document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
    selectTipo('egreso');
  }
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  if (id === 'modal-tx') clearTxForm();
}

function clearTxForm() {
  ['tx-desc', 'tx-amount', 'tx-note'].forEach(id => document.getElementById(id).value = '');
}

document.querySelectorAll('.modal-overlay').forEach(el => {
  el.addEventListener('click', e => { if (e.target === el) el.classList.remove('open'); });
});

function selectTipo(t) {
  const li = document.getElementById('lbl-ingreso');
  const le = document.getElementById('lbl-egreso');
  li.className = t === 'ingreso' ? 'sel-ingreso' : '';
  le.className = t === 'egreso'  ? 'sel-egreso'  : '';
  const cats = document.getElementById('tx-cat');
  if (t === 'ingreso') {
    cats.innerHTML = '<option value="otro">💰 Ingreso de dinero</option><option value="servicios">💡 Servicios</option><option value="otro">📦 Otro</option>';
  } else {
    cats.innerHTML = Object.entries(CATEGORIES)
      .map(([k, v]) => `<option value="${k}">${v.icon} ${v.label}</option>`).join('');
  }
}

function saveTx() {
  const tipo   = document.querySelector('.tipo-radio label.sel-ingreso') ? 'ingreso' : 'egreso';
  const desc   = document.getElementById('tx-desc').value.trim();
  const amount = parseFloat(document.getElementById('tx-amount').value);
  const card   = document.getElementById('tx-card').value;
  const cat    = document.getElementById('tx-cat').value;
  const date   = document.getElementById('tx-date').value;
  const note   = document.getElementById('tx-note').value.trim();

  if (!desc)             return toast('⚠️ Escribe una descripción');
  if (!amount || amount <= 0) return toast('⚠️ Ingresa un monto válido');

  const tx = { id: Date.now().toString(), tipo, desc, amount, card, cat, date, note };
  data.transactions.push(tx);

  if (tipo === 'ingreso') data.balances[card] += amount;
  else                    data.balances[card] -= amount;

  saveData(data);
  closeModal('modal-tx');
  toast('✅ Movimiento registrado');
  renderDashboard();
}

function deleteTx(id) {
  const tx = data.transactions.find(t => t.id === id);
  if (!tx) return;
  if (tx.tipo === 'ingreso') data.balances[tx.card] -= tx.amount;
  else                       data.balances[tx.card] += tx.amount;
  data.transactions = data.transactions.filter(t => t.id !== id);
  saveData(data);
  toast('🗑️ Movimiento eliminado');
  renderDashboard();
  renderMovimientos();
  renderHistorial();
}

function editBalance(cardId) {
  document.getElementById('edit-card-id').value    = cardId;
  document.getElementById('edit-balance-val').value = data.balances[cardId];
  openModal('modal-edit-balance');
}

function saveCardBalance() {
  const id  = document.getElementById('edit-card-id').value;
  const val = parseFloat(document.getElementById('edit-balance-val').value);
  if (isNaN(val)) return toast('⚠️ Valor inválido');
  data.balances[id] = val;
  saveData(data);
  closeModal('modal-edit-balance');
  toast('✅ Saldo actualizado');
  renderDashboard();
  renderTarjetas();
}

function fmtFull(n) {
  return '$' + Math.abs(n).toLocaleString('es-CO', { maximumFractionDigits: 0 });
}

function fmtDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' });
}

function monthKey(d) {
  return d.getFullYear() + '-' + (d.getMonth() + 1).toString().padStart(2, '0');
}

function renderDashboard() {
  const h = new Date().getHours();
  document.getElementById('greeting-time').textContent = h < 12 ? 'buenos días' : h < 18 ? 'buenas tardes' : 'buenas noches';
  document.getElementById('today-date').textContent = new Date().toLocaleDateString('es-CO', { weekday:'long', day:'numeric', month:'long' });

  const total = Object.values(data.balances).reduce((a, b) => a + b, 0);
  const tb = document.getElementById('total-balance');
  tb.textContent = fmtFull(total);
  tb.style.color = total < 0 ? 'var(--danger)' : 'var(--accent)';

  document.getElementById('cards-grid').innerHTML = CARDS.map(c => `
    <div class="wallet-card ${c.class}">
      <div class="card-chip"></div>
      <div class="card-label">${c.icon} ${c.name}</div>
      <div class="card-amount">${fmtFull(data.balances[c.id])}</div>
      <div class="card-actions">
        <button class="btn-card" onclick="openModal('modal-tx')">+ Mover</button>
        <button class="btn-card" onclick="editBalance('${c.id}')">✏️ Editar</button>
      </div>
    </div>
  `).join('');

  const mk = monthKey(new Date());
  const monthTx = data.transactions.filter(t => t.date.startsWith(mk));
  const inc = monthTx.filter(t => t.tipo === 'ingreso').reduce((a, b) => a + b.amount, 0);
  const exp = monthTx.filter(t => t.tipo === 'egreso').reduce((a, b) => a + b.amount, 0);
  document.getElementById('month-incomes').textContent  = fmtFull(inc);
  document.getElementById('month-expenses').textContent = fmtFull(exp);
  const mb  = inc - exp;
  const mbe = document.getElementById('month-balance');
  mbe.textContent  = fmtFull(mb);
  mbe.style.color  = mb < 0 ? 'var(--danger)' : 'var(--accent)';

  const todayStr = new Date().toISOString().split('T')[0];
  document.getElementById('today-txs').textContent = data.transactions.filter(t => t.date === todayStr).length;

  const recent = [...data.transactions].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).slice(0, 5);
  const rl = document.getElementById('recent-tx-list');
  rl.innerHTML = recent.length
    ? recent.map(tx => txHTML(tx)).join('')
    : `<div class="empty-state"><div class="empty-icon">💸</div><p>Sin movimientos aún. ¡Registra el primero!</p></div>`;
}

function txHTML(tx) {
  const cat = CATEGORIES[tx.cat] || { icon:'📦', label:'Otro' };
  return `
  <div class="tx-item">
    <div class="tx-icon ${tx.tipo}">${tx.tipo === 'ingreso' ? '💚' : '🔴'}</div>
    <div class="tx-info">
      <div class="tx-desc">${tx.desc}</div>
      <div class="tx-meta">
        <span>${fmtDate(tx.date)}</span>
        <span>·</span>
        <span>${tx.card}</span>
        <span class="tx-tag cat-${tx.cat}">${cat.icon} ${cat.label}</span>
      </div>
    </div>
    <div class="tx-amount ${tx.tipo}">${tx.tipo === 'ingreso' ? '+' : '-'}${fmtFull(tx.amount)}</div>
    <button class="tx-delete" onclick="deleteTx('${tx.id}')">✕</button>
  </div>`;
}

function filterTx(btn, f) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  txFilter = f;
  renderMovimientos();
}

function renderMovimientos() {
  let txs = [...data.transactions].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  if (txFilter === 'ingreso') txs = txs.filter(t => t.tipo === 'ingreso');
  else if (txFilter === 'egreso') txs = txs.filter(t => t.tipo === 'egreso');
  else if (['Nequi', 'Bancolombia', 'MIO'].includes(txFilter)) txs = txs.filter(t => t.card === txFilter);

  const el = document.getElementById('full-tx-list');
  el.innerHTML = txs.length
    ? txs.map(tx => txHTML(tx)).join('')
    : `<div class="empty-state"><div class="empty-icon">🔍</div><p>No hay movimientos con este filtro</p></div>`;
}

function changeChartMonth(d) {
  chartMonth = new Date(chartMonth.getFullYear(), chartMonth.getMonth() + d, 1);
  renderGraficas();
}

function destroyChart(id) {
  if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; }
}

function renderGraficas() {
  const mk = monthKey(chartMonth);
  document.getElementById('chart-month-label').textContent =
    chartMonth.toLocaleDateString('es-CO', { month:'long', year:'numeric' });

  const txs      = data.transactions.filter(t => t.date.startsWith(mk));
  const expenses = txs.filter(t => t.tipo === 'egreso');
  const incomes  = txs.filter(t => t.tipo === 'ingreso');

  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color:'#9090b0', font:{ family:'Syne', size:12 } } } }
  };

  destroyChart('chart-cat');
  const catData = {};
  expenses.forEach(t => { catData[t.cat] = (catData[t.cat] || 0) + t.amount; });
  const catLabels = Object.keys(catData).map(k => (CATEGORIES[k]||{label:k}).icon + ' ' + (CATEGORIES[k]||{label:k}).label);
  chartInstances['chart-cat'] = new Chart(document.getElementById('chart-cat'), {
    type: 'doughnut',
    data: {
      labels: catLabels,
      datasets: [{ data: Object.values(catData), backgroundColor: ['#f59e0b','#3b82f6','#a78bfa','#10b981','#00d4aa','#f43f5e','#6b7280'], borderWidth: 0 }]
    },
    options: { ...chartDefaults }
  });

  destroyChart('chart-balance');
  const inc = incomes.reduce((a, b) => a + b.amount, 0);
  const exp = expenses.reduce((a, b) => a + b.amount, 0);
  chartInstances['chart-balance'] = new Chart(document.getElementById('chart-balance'), {
    type: 'bar',
    data: {
      labels: ['Ingresos', 'Gastos'],
      datasets: [{ data: [inc, exp], backgroundColor: ['rgba(16,185,129,0.7)', 'rgba(244,63,94,0.7)'], borderRadius: 8, borderWidth: 0 }]
    },
    options: { ...chartDefaults, plugins:{ legend:{ display:false } }, scales: { x:{ ticks:{color:'#9090b0'}, grid:{color:'#1a1a28'} }, y:{ ticks:{color:'#9090b0'}, grid:{color:'#1a1a28'} } } }
  });

  destroyChart('chart-cards');
  const cardTotals = { Nequi:0, Bancolombia:0, MIO:0 };
  expenses.forEach(t => { if (cardTotals[t.card] !== undefined) cardTotals[t.card] += t.amount; });
  chartInstances['chart-cards'] = new Chart(document.getElementById('chart-cards'), {
    type: 'pie',
    data: {
      labels: ['Nequi', 'Bancolombia', 'MIO'],
      datasets: [{ data: Object.values(cardTotals), backgroundColor: ['rgba(124,58,237,0.8)','rgba(29,78,216,0.8)','rgba(217,119,6,0.8)'], borderWidth: 0 }]
    },
    options: { ...chartDefaults }
  });

  destroyChart('chart-daily');
  const daysInMonth = new Date(chartMonth.getFullYear(), chartMonth.getMonth() + 1, 0).getDate();
  const dailyLabels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const dailyInc = new Array(daysInMonth).fill(0);
  const dailyExp = new Array(daysInMonth).fill(0);
  txs.forEach(t => {
    const day = parseInt(t.date.split('-')[2]) - 1;
    if (t.tipo === 'ingreso') dailyInc[day] += t.amount;
    else                      dailyExp[day] += t.amount;
  });
  chartInstances['chart-daily'] = new Chart(document.getElementById('chart-daily'), {
    type: 'line',
    data: {
      labels: dailyLabels,
      datasets: [
        { label:'Ingresos', data:dailyInc, borderColor:'#10b981', backgroundColor:'rgba(16,185,129,0.1)', tension:0.4, fill:true, pointRadius:3 },
        { label:'Gastos',   data:dailyExp, borderColor:'#f43f5e', backgroundColor:'rgba(244,63,94,0.1)',  tension:0.4, fill:true, pointRadius:3 }
      ]
    },
    options: { ...chartDefaults, scales: { x:{ ticks:{color:'#9090b0'}, grid:{color:'#1a1a28'} }, y:{ ticks:{color:'#9090b0'}, grid:{color:'#1a1a28'} } } }
  });
}

function changeHistMonth(d) {
  histMonth = new Date(histMonth.getFullYear(), histMonth.getMonth() + d, 1);
  renderHistorial();
}

function renderHistorial() {
  const mk = monthKey(histMonth);
  document.getElementById('hist-month-label').textContent =
    histMonth.toLocaleDateString('es-CO', { month:'long', year:'numeric' });

  const txs = data.transactions.filter(t => t.date.startsWith(mk))
    .sort((a, b) => b.date.localeCompare(a.date));

  const inc = txs.filter(t => t.tipo === 'ingreso').reduce((a, b) => a + b.amount, 0);
  const exp = txs.filter(t => t.tipo === 'egreso').reduce((a, b) => a + b.amount, 0);
  const bal = inc - exp;

  document.getElementById('hist-summary').innerHTML = `
    <div class="summary-card"><div class="s-label">Ingresos</div><div class="s-value green">${fmtFull(inc)}</div></div>
    <div class="summary-card"><div class="s-label">Gastos</div><div class="s-value red">${fmtFull(exp)}</div></div>
    <div class="summary-card"><div class="s-label">Balance</div><div class="s-value ${bal >= 0 ? 'accent' : 'red'}">${(bal < 0 ? '-' : '') + fmtFull(bal)}</div></div>
    <div class="summary-card"><div class="s-label">Movimientos</div><div class="s-value accent">${txs.length}</div></div>
  `;

  const el = document.getElementById('hist-tx-list');
  el.innerHTML = txs.length
    ? txs.map(tx => txHTML(tx)).join('')
    : `<div class="empty-state"><div class="empty-icon">📅</div><p>Sin movimientos en este mes</p></div>`;
}

function renderTarjetas() {
  document.getElementById('tarjetas-detail').innerHTML = CARDS.map(c => {
    const txs = data.transactions.filter(t => t.card === c.id);
    const inc = txs.filter(t => t.tipo === 'ingreso').reduce((a, b) => a + b.amount, 0);
    const exp = txs.filter(t => t.tipo === 'egreso').reduce((a, b) => a + b.amount, 0);
    return `
    <div class="wallet-card ${c.class}">
      <div class="card-chip"></div>
      <div class="card-label">${c.icon} ${c.name}</div>
      <div class="card-amount">${fmtFull(data.balances[c.id])}</div>
      <div style="font-size:12px;opacity:0.7;margin-bottom:8px;">
        <span>Total ingresos: ${fmtFull(inc)}</span><br>
        <span>Total gastos: ${fmtFull(exp)}</span><br>
        <span>Movimientos: ${txs.length}</span>
      </div>
      <div class="card-actions">
        <button class="btn-card" onclick="editBalance('${c.id}')">✏️ Editar saldo</button>
      </div>
    </div>`;
  }).join('');
}

function exportCSV() {
  const mk  = monthKey(histMonth);
  const txs = data.transactions.filter(t => t.date.startsWith(mk))
    .sort((a, b) => a.date.localeCompare(b.date));

  const rows = [['Fecha', 'Tipo', 'Descripción', 'Monto', 'Tarjeta', 'Categoría', 'Nota']];
  txs.forEach(t => {
    rows.push([t.date, t.tipo, t.desc, t.amount, t.card, (CATEGORIES[t.cat]||{label:t.cat}).label, t.note||'']);
  });
  const csv  = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type:'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `fintrack-${mk}.csv`; a.click();
  toast('✅ CSV descargado');
}

function exportPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const mk  = monthKey(histMonth);
  const txs = data.transactions.filter(t => t.date.startsWith(mk))
    .sort((a, b) => a.date.localeCompare(b.date));

  const monthName = histMonth.toLocaleDateString('es-CO', { month:'long', year:'numeric' });
  doc.setFontSize(18); doc.text('FinTrack — ' + monthName, 14, 20);
  doc.setFontSize(11);

  const inc = txs.filter(t => t.tipo === 'ingreso').reduce((a, b) => a + b.amount, 0);
  const exp = txs.filter(t => t.tipo === 'egreso').reduce((a, b) => a + b.amount, 0);
  doc.text(`Ingresos: ${fmtFull(inc)}   Gastos: ${fmtFull(exp)}   Balance: ${fmtFull(inc - exp)}`, 14, 32);

  let y = 44;
  doc.setFontSize(9);
  doc.text('Fecha', 14, y); doc.text('Tipo', 45, y); doc.text('Descripción', 65, y); doc.text('Monto', 140, y); doc.text('Tarjeta', 165, y);
  y += 6; doc.line(14, y, 196, y); y += 4;

  txs.forEach(t => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.text(t.date, 14, y);
    doc.text(t.tipo, 45, y);
    doc.text((t.desc||'').substring(0, 35), 65, y);
    doc.text(fmtFull(t.amount), 140, y);
    doc.text(t.card, 165, y);
    y += 6;
  });

  doc.save(`fintrack-${mk}.pdf`);
  toast('✅ PDF descargado');
}

function checkNotifPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    document.getElementById('notif-perm-bar').style.display = 'flex';
  }
}

function requestNotifPerm() {
  Notification.requestPermission().then(p => {
    document.getElementById('notif-perm-bar').style.display = 'none';
    if (p === 'granted') {
      toast('🔔 Notificaciones activadas para el día 4');
      scheduleDay4Check();
    }
  });
}

function scheduleDay4Check() {
  if (new Date().getDate() === 4) sendDay4Notif();
}

function sendDay4Notif() {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('📊 FinTrack — Recordatorio mensual', {
      body: '¡Hoy es día 4! Es un buen momento para revisar tus finanzas.',
      icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>💳</text></svg>'
    });
  }
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function init() {
  renderDashboard();
  checkNotifPermission();
  scheduleDay4Check();
  selectTipo('egreso');
  chartMonth = new Date();
  histMonth  = new Date();

  setInterval(() => {
    const now = new Date();
    if (now.getDate() === 4 && now.getHours() === 9 && now.getMinutes() === 0) {
      sendDay4Notif();
    }
  }, 60000);
}

init();