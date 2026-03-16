// ============================================================
// STATE & STORAGE
// ============================================================
const MN = ['jan','fév','mar','avr','mai','juin','juil','août','sep','oct','nov','déc'];
const MNF = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const CAT_COLORS = ['#5b9de8','#e8a140','#e05c4b','#b87ae8','#5bb87a','#4ab8b8','#7a7870'];
const CAT_LABELS = ['Alimentation & restos','Carburant & station','Sorties & divert.','Voyages','Supermarchés','Transports','Divers'];
const STORAGE_KEY = 'budget_tracker_v1';

let state = {
  months: [],       // [{year,month,credits,debits,cats:{food,fuel,night,travel,shop,transport,other}}, ...]
  repayments: [],   // [{date,amount,note}, ...]
  debt: { total: 0, rate: 0 }
};

function load() {
  const s = localStorage.getItem(STORAGE_KEY);
  if (s) { try { state = JSON.parse(s); } catch(e){} }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ============================================================
// TABS
// ============================================================
function goTab(id) {
  document.querySelectorAll('.nav-tab').forEach((t,i)=>{
    t.classList.toggle('active', ['dashboard','import','dette','insights'][i]===id);
  });
  document.querySelectorAll('.tab-section').forEach(s=>{
    s.classList.toggle('active', s.id==='tab-'+id);
  });
  if(id==='dashboard') renderDashboard();
  if(id==='import') renderImportList();
  if(id==='dette') renderDette();
  if(id==='insights') renderInsights();
}

// ============================================================
// TOAST
// ============================================================
function toast(msg, type='success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(()=>t.className='toast', 2800);
}

// ============================================================
// CHARTS INSTANCES
// ============================================================
let charts = {};
function destroyChart(id) { if(charts[id]) { charts[id].destroy(); delete charts[id]; } }

// ============================================================
// DASHBOARD
// ============================================================
function renderDashboard() {
  const months = state.months.slice().sort((a,b)=> a.year!==b.year ? a.year-b.year : a.month-b.month);
  const hasData = months.length > 0;
  document.getElementById('noDataMsg').style.display = hasData ? 'none' : 'block';
  document.getElementById('dashContent').style.display = hasData ? 'block' : 'none';
  if (!hasData) return;

  // Update header
  const last = months[months.length-1];
  document.getElementById('headerSub').textContent =
    months.length + ' mois enregistrés · Dernier : ' + MNF[last.month] + ' ' + last.year;

  // Metrics
  const avgCredits = months.reduce((s,m)=>s+m.credits,0)/months.length;
  const avgDebits = months.reduce((s,m)=>s+m.debits,0)/months.length;
  const totalRepaid = state.repayments.reduce((s,r)=>s+r.amount,0);
  const restant = state.debt.total > 0 ? Math.max(0, state.debt.total - totalRepaid) : null;
  const debtMetric = restant !== null
    ? `<div class="mc amber"><div class="mc-tag">Dette restante</div><div class="mc-val amber">${fmt(restant)} CHF</div><div class="mc-note">${fmt(totalRepaid)} CHF remboursés</div></div>`
    : '';
  document.getElementById('dashMetrics').innerHTML = `
    <div class="mc green"><div class="mc-tag">Revenu moyen / mois</div><div class="mc-val green">${fmt(avgCredits)} CHF</div><div class="mc-note">Moy. sur ${months.length} mois</div></div>
    <div class="mc red"><div class="mc-tag">Dépenses moyennes / mois</div><div class="mc-val red">${fmt(avgDebits)} CHF</div><div class="mc-note">Moy. sur ${months.length} mois</div></div>
    <div class="mc ${avgCredits-avgDebits>=0?'green':'red'}"><div class="mc-tag">Solde moyen / mois</div><div class="mc-val ${avgCredits-avgDebits>=0?'green':'red'}">${avgCredits-avgDebits>=0?'+':''}${fmt(avgCredits-avgDebits)} CHF</div><div class="mc-note">Revenus − dépenses</div></div>
    ${debtMetric}
  `;

  // Bar chart
  destroyChart('cBar');
  const ctx1 = document.getElementById('cBar').getContext('2d');
  charts['cBar'] = new Chart(ctx1, {
    type:'bar',
    data:{
      labels: months.map(m=>MN[m.month]+' '+String(m.year).slice(2)),
      datasets:[
        {label:'Revenus',data:months.map(m=>m.credits),backgroundColor:'rgba(91,184,122,0.2)',borderColor:'#5bb87a',borderWidth:1.5,borderRadius:5,borderSkipped:false},
        {label:'Dépenses',data:months.map(m=>m.debits),backgroundColor:'rgba(224,92,75,0.2)',borderColor:'#e05c4b',borderWidth:1.5,borderRadius:5,borderSkipped:false},
      ]
    },
    options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index'},
      plugins:{legend:{display:false},tooltip:{backgroundColor:'#1e1e22',titleColor:'#7a7870',bodyColor:'#f0ede8',borderColor:'rgba(255,255,255,0.1)',borderWidth:0.5,callbacks:{label:c=>' '+c.dataset.label+': '+c.raw.toLocaleString('fr-CH')+' CHF'}}},
      scales:{y:{beginAtZero:true,grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#7a7870',font:{size:11,family:"'DM Mono',monospace"},callback:v=>v.toLocaleString('fr-CH')}},x:{grid:{display:false},ticks:{color:'#7a7870',font:{size:11,family:"'Sora',sans-serif"}}}}}
  });

  // Aggregate cats
  const totCats = [0,0,0,0,0,0,0];
  months.forEach(m=>{
    if(m.cats){
      totCats[0]+=m.cats.food||0; totCats[1]+=m.cats.fuel||0;
      totCats[2]+=m.cats.night||0; totCats[3]+=m.cats.travel||0;
      totCats[4]+=m.cats.shop||0; totCats[5]+=m.cats.transport||0;
      totCats[6]+=m.cats.other||0;
    }
  });
  const totalCat = totCats.reduce((s,v)=>s+v,0)||1;

  destroyChart('cDonut');
  const ctx2 = document.getElementById('cDonut').getContext('2d');
  charts['cDonut'] = new Chart(ctx2, {
    type:'doughnut',
    data:{labels:CAT_LABELS,datasets:[{data:totCats,backgroundColor:CAT_COLORS.map(c=>c+'33'),borderColor:CAT_COLORS,borderWidth:1.5,hoverOffset:5}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'62%',plugins:{legend:{display:false},tooltip:{backgroundColor:'#1e1e22',titleColor:'#7a7870',bodyColor:'#f0ede8',borderColor:'rgba(255,255,255,0.1)',borderWidth:0.5,callbacks:{label:c=>' '+c.raw.toLocaleString('fr-CH')+' CHF ('+Math.round(c.raw/totalCat*100)+'%)'}}}}
  });

  const catEl = document.getElementById('catList');
  catEl.innerHTML = '';
  const sorted = totCats.map((v,i)=>({v,i})).sort((a,b)=>b.v-a.v);
  sorted.forEach(({v,i})=>{
    if(v===0) return;
    const pct = Math.round(v/totalCat*100);
    catEl.innerHTML += `<div class="cat-item">
      <div class="cat-header">
        <span class="cat-name"><span class="cat-dot" style="background:${CAT_COLORS[i]}"></span>${CAT_LABELS[i]}</span>
        <span class="cat-amount">${v.toLocaleString('fr-CH')} CHF · ${pct}%</span>
      </div>
      <div class="bar-bg"><div class="bar-fill" style="width:${Math.min(100,pct*2.5)}%;background:${CAT_COLORS[i]}"></div></div>
    </div>`;
  });

  // Month table
  const mtEl = document.getElementById('monthTable');
  mtEl.innerHTML = '';
  [...months].reverse().forEach(m=>{
    const s = m.credits - m.debits;
    mtEl.innerHTML += `<tr>
      <td><strong>${MNF[m.month]} ${m.year}</strong></td>
      <td class="td-mono" style="color:var(--green)">${m.credits.toLocaleString('fr-CH')} CHF</td>
      <td class="td-mono" style="color:var(--red)">${m.debits.toLocaleString('fr-CH')} CHF</td>
      <td class="td-mono" style="color:${s>=0?'var(--green)':'var(--red)'}">${s>=0?'+':''}${s.toLocaleString('fr-CH')} CHF</td>
      <td></td>
    </tr>`;
  });
}

// ============================================================
// IMPORT
// ============================================================
function saveMonth() {
  const month = parseInt(document.getElementById('fMonth').value);
  const year = parseInt(document.getElementById('fYear').value);
  const credits = parseFloat(document.getElementById('fCredits').value)||0;
  const debits = parseFloat(document.getElementById('fDebits').value)||0;
  if (!credits && !debits) { toast('Entre au moins les crédits ou débits.', 'error'); return; }
  const cats = {
    food:      parseFloat(document.getElementById('cFood').value)||0,
    fuel:      parseFloat(document.getElementById('cFuel').value)||0,
    night:     parseFloat(document.getElementById('cNight').value)||0,
    travel:    parseFloat(document.getElementById('cTravel').value)||0,
    shop:      parseFloat(document.getElementById('cShop').value)||0,
    transport: parseFloat(document.getElementById('cTransport').value)||0,
    other:     parseFloat(document.getElementById('cOther').value)||0,
  };
  const idx = state.months.findIndex(m=>m.year===year&&m.month===month);
  const entry = {year,month,credits,debits,cats};
  if (idx>=0) { state.months[idx] = entry; toast('Mois mis à jour — '+MNF[month]+' '+year); }
  else { state.months.push(entry); toast('Mois ajouté — '+MNF[month]+' '+year); }
  save();
  renderImportList();
  clearImportForm();
}

function clearImportForm() {
  ['fCredits','fDebits','cFood','cFuel','cNight','cTravel','cShop','cTransport','cOther'].forEach(id=>{
    document.getElementById(id).value='';
  });
}

function loadMonthIntoForm(year, month) {
  const m = state.months.find(m=>m.year===year&&m.month===month);
  if (!m) return;
  document.getElementById('fMonth').value = month;
  document.getElementById('fYear').value = year;
  document.getElementById('fCredits').value = m.credits;
  document.getElementById('fDebits').value = m.debits;
  if (m.cats) {
    document.getElementById('cFood').value = m.cats.food||'';
    document.getElementById('cFuel').value = m.cats.fuel||'';
    document.getElementById('cNight').value = m.cats.night||'';
    document.getElementById('cTravel').value = m.cats.travel||'';
    document.getElementById('cShop').value = m.cats.shop||'';
    document.getElementById('cTransport').value = m.cats.transport||'';
    document.getElementById('cOther').value = m.cats.other||'';
  }
  window.scrollTo({top:0,behavior:'smooth'});
}

function deleteMonth(year, month) {
  if (!confirm('Supprimer '+MNF[month]+' '+year+' ?')) return;
  state.months = state.months.filter(m=>!(m.year===year&&m.month===month));
  save();
  renderImportList();
  toast('Mois supprimé.', 'error');
}

function renderImportList() {
  const tbody = document.getElementById('importedMonths');
  const empty = document.getElementById('importedEmpty');
  const months = state.months.slice().sort((a,b)=>a.year!==b.year?b.year-a.year:b.month-a.month);
  if (months.length===0) { tbody.innerHTML=''; empty.style.display='block'; return; }
  empty.style.display='none';
  tbody.innerHTML = months.map(m=>{
    const s = m.credits - m.debits;
    return `<tr>
      <td><strong>${MNF[m.month]} ${m.year}</strong></td>
      <td class="td-mono" style="color:var(--green)">${m.credits.toLocaleString('fr-CH')}</td>
      <td class="td-mono" style="color:var(--red)">${m.debits.toLocaleString('fr-CH')}</td>
      <td class="td-mono" style="color:${s>=0?'var(--green)':'var(--red)'}">${s>=0?'+':''}${s.toLocaleString('fr-CH')}</td>
      <td><div style="display:flex;gap:6px">
        <button class="btn sm" onclick="loadMonthIntoForm(${m.year},${m.month})">Modifier</button>
        <button class="btn sm danger" onclick="deleteMonth(${m.year},${m.month})">Supprimer</button>
      </div></td>
    </tr>`;
  }).join('');
}

// ============================================================
// DETTE
// ============================================================
function saveRepayment() {
  const date = document.getElementById('rDate').value;
  const amount = parseFloat(document.getElementById('rAmount').value)||0;
  const note = document.getElementById('rNote').value.trim();
  if (!date || !amount) { toast('Entre une date et un montant.', 'error'); return; }
  state.repayments.push({date,amount,note});
  state.repayments.sort((a,b)=>a.date.localeCompare(b.date));
  save();
  document.getElementById('rDate').value='';
  document.getElementById('rAmount').value='';
  document.getElementById('rNote').value='';
  toast('Remboursement enregistré — '+fmt(amount)+' CHF');
  renderDette();
}

function deleteRepayment(idx) {
  if(!confirm('Supprimer ce versement ?')) return;
  state.repayments.splice(idx,1);
  save();
  renderDette();
  toast('Versement supprimé.','error');
}

function saveDebtParams() {
  const t = parseFloat(document.getElementById('debtTotal').value);
  const r = parseFloat(document.getElementById('debtRate').value)||0;
  if (!t) { toast('Entre le montant total.','error'); return; }
  state.debt.total = t;
  state.debt.rate = r;
  save();
  toast('Paramètres mis à jour.');
  renderDette();
}

function renderDette() {
  document.getElementById('debtTotal').value = state.debt.total || '';
  document.getElementById('debtRate').value = state.debt.rate || '';

  const totalRepaid = state.repayments.reduce((s,r)=>s+r.amount,0);

  if (state.debt.total <= 0) {
    document.getElementById('detteProgress').innerHTML = `
      <div class="empty" style="padding:24px">
        <div class="empty-icon">💳</div>
        <div class="empty-text">Configure le montant de ta dette dans <strong>Paramètres de la dette</strong> ci-dessous.</div>
      </div>`;
  } else {
    const restant = Math.max(0, state.debt.total - totalRepaid);
    const pct = Math.min(100, totalRepaid / state.debt.total * 100);
    document.getElementById('detteProgress').innerHTML = `
      <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--muted);margin-bottom:6px;">
        <span>Remboursé : <strong style="color:var(--green)">${fmt(totalRepaid)} CHF</strong></span>
        <span>Restant : <strong style="color:var(--amber)">${fmt(restant)} CHF</strong></span>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${pct.toFixed(1)}%"></div></div>
      <div class="progress-labels"><span>0 CHF</span><span>${pct.toFixed(1)}% soldé</span><span>${fmt(state.debt.total)} CHF</span></div>
      <div class="metric-grid" style="margin-top:16px">
        <div class="mc green"><div class="mc-tag">Remboursé</div><div class="mc-val green">${fmt(totalRepaid)} CHF</div><div class="mc-note">${state.repayments.length} versement(s)</div></div>
        <div class="mc amber"><div class="mc-tag">Restant</div><div class="mc-val amber">${fmt(restant)} CHF</div><div class="mc-note">${pct.toFixed(1)}% soldé</div></div>
        <div class="mc blue"><div class="mc-tag">Total initial</div><div class="mc-val blue">${fmt(state.debt.total)} CHF</div><div class="mc-note">Taux : ${state.debt.rate}%</div></div>
      </div>`;
  }

  // Repayment history chart
  destroyChart('cRepay');
  if (state.repayments.length > 0) {
    let cum = 0;
    const labels=[], dataCum=[], dataSingle=[];
    state.repayments.forEach(r=>{
      cum += r.amount;
      labels.push(r.date.slice(0,7));
      dataCum.push(+cum.toFixed(2));
      dataSingle.push(r.amount);
    });
    const ctx = document.getElementById('cRepay').getContext('2d');
    charts['cRepay'] = new Chart(ctx, {
      data:{labels,datasets:[
        {type:'bar',label:'Versement',data:dataSingle,backgroundColor:'rgba(91,184,122,0.25)',borderColor:'#5bb87a',borderWidth:1.5,borderRadius:4,yAxisID:'y1'},
        {type:'line',label:'Cumulé',data:dataCum,borderColor:'#e8a140',backgroundColor:'rgba(232,161,64,0.06)',fill:true,tension:.3,pointRadius:3,borderWidth:2,yAxisID:'y'}
      ]},
      options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index'},plugins:{legend:{display:false},tooltip:{backgroundColor:'#1e1e22',titleColor:'#7a7870',bodyColor:'#f0ede8',borderColor:'rgba(255,255,255,0.1)',borderWidth:0.5}},scales:{y:{position:'left',beginAtZero:true,grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#7a7870',font:{size:10,family:"'DM Mono',monospace"},callback:v=>v.toLocaleString('fr-CH')}},y1:{position:'right',beginAtZero:true,grid:{display:false},ticks:{color:'#7a7870',font:{size:10,family:"'DM Mono',monospace"},callback:v=>v.toLocaleString('fr-CH')}},x:{grid:{display:false},ticks:{color:'#7a7870',font:{size:10}}}}}
    });
  }

  // List
  const listEl = document.getElementById('repayList');
  if (state.repayments.length===0) {
    listEl.innerHTML = '<div class="empty"><div class="empty-icon">💳</div><div class="empty-text">Aucun versement enregistré.</div></div>';
  } else {
    listEl.innerHTML = [...state.repayments].reverse().map((r,revIdx)=>{
      const i = state.repayments.length - 1 - revIdx;
      return `<div class="repay-row">
        <span class="repay-date">${r.date}</span>
        <span class="repay-amount">+${fmt(r.amount)} CHF</span>
        <span class="repay-note">${r.note||'—'}</span>
        <button class="repay-delete" onclick="deleteRepayment(${i})" title="Supprimer">✕</button>
      </div>`;
    }).join('');
  }

  updateSim(parseInt(document.getElementById('simSlider').value));
}

function updateSim(m) {
  document.getElementById('simVal').textContent = m + ' CHF / mois';
  const totalRepaid = state.repayments.reduce((s,r)=>s+r.amount,0);
  const restant = state.debt.total > 0 ? Math.max(0, state.debt.total - totalRepaid) : 0;
  if (restant <= 0) {
    document.getElementById('sDuree').textContent = state.debt.total > 0 ? '0' : '—';
    document.getElementById('sDate').textContent = state.debt.total > 0 ? 'Soldé !' : '—';
    document.getElementById('sEcon').textContent = '—';
    destroyChart('cSim');
    return;
  }
  const mois = Math.ceil(restant / m);
  document.getElementById('sDuree').textContent = mois;
  const now = new Date();
  const fin = new Date(now); fin.setMonth(fin.getMonth()+mois);
  document.getElementById('sDate').textContent = MN[fin.getMonth()]+' '+fin.getFullYear();

  const avgDebits = state.months.length ? state.months.reduce((s,mo)=>s+mo.debits,0)/state.months.length : 0;
  const avgCredits = state.months.length ? state.months.reduce((s,mo)=>s+mo.credits,0)/state.months.length : 0;
  const needed = Math.max(0, m - (avgCredits - avgDebits));
  document.getElementById('sEcon').textContent = needed > 0 ? '+'+fmt(needed)+' CHF' : '0 CHF';

  // Sim chart
  const labels=[], data=[];
  const steps = Math.min(mois, 36);
  for(let i=0;i<=steps;i++){
    const d=new Date(now); d.setMonth(d.getMonth()+i);
    labels.push(MN[d.getMonth()]+' '+String(d.getFullYear()).slice(2));
    data.push(Math.max(0, restant - m*i));
  }
  if(mois>36){ labels.push('fin'); data.push(0); }

  destroyChart('cSim');
  const ctx = document.getElementById('cSim').getContext('2d');
  charts['cSim'] = new Chart(ctx, {
    type:'line',
    data:{labels,datasets:[{data,borderColor:'#e8a140',backgroundColor:'rgba(232,161,64,0.07)',fill:true,tension:.3,pointRadius:0,borderWidth:2}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'#1e1e22',titleColor:'#7a7870',bodyColor:'#f0ede8',borderColor:'rgba(255,255,255,0.1)',borderWidth:0.5,callbacks:{label:c=>' '+c.raw.toLocaleString('fr-CH')+' CHF restants'}}},scales:{y:{beginAtZero:true,grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#7a7870',font:{size:10,family:"'DM Mono',monospace"},callback:v=>v.toLocaleString('fr-CH')}},x:{grid:{display:false},ticks:{color:'#7a7870',font:{size:10},maxTicksLimit:8}}}}
  });
}

// ============================================================
// INSIGHTS
// ============================================================
function renderInsights() {
  const months = state.months;
  const el = document.getElementById('insightsContent');

  if (months.length === 0) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">💡</div><div class="empty-text">Ajoute des mois dans <strong>Importer un mois</strong> pour voir les conseils.</div></div>';
    return;
  }

  const totalRepaid = state.repayments.reduce((s,r)=>s+r.amount,0);
  const restant = state.debt.total > 0 ? Math.max(0, state.debt.total - totalRepaid) : null;
  const avgC = months.reduce((s,m)=>s+m.credits,0)/months.length;
  const avgD = months.reduce((s,m)=>s+m.debits,0)/months.length;
  const solde = avgC - avgD;

  const insights = [];

  // Budget equilibrium
  insights.push({
    type: solde < 0 ? 'danger' : 'ok',
    head: solde < 0 ? 'Déficit mensuel' : 'Budget équilibré',
    body: solde < 0
      ? `Tu dépenses en moyenne <strong>${fmt(Math.abs(solde))} CHF de plus</strong> que tu gagnes chaque mois. Identifie les postes à réduire en priorité.`
      : `Tu dégages en moyenne <strong>${fmt(solde)} CHF</strong> par mois. Utilise cet excédent pour rembourser ta dette ou alimenter ton épargne.`
  });

  // Category-based insights
  const totCats = {food:0,fuel:0,night:0,travel:0,shop:0,transport:0,other:0};
  months.forEach(m => { if(m.cats) Object.keys(totCats).forEach(k => totCats[k] += m.cats[k]||0); });
  const totalDebitsAll = months.reduce((s,m)=>s+m.debits,0);

  if (totalDebitsAll > 0) {
    const foodPct = totCats.food / totalDebitsAll * 100;
    if (foodPct > 20) {
      insights.push({ type: 'warn', head: 'Alimentation & restos', body: `Ce poste représente <strong>${Math.round(foodPct)}% de tes dépenses totales</strong>. Cuisiner davantage à domicile peut libérer une marge significative.` });
    }

    const fuelPct = totCats.fuel / totalDebitsAll * 100;
    if (fuelPct > 10) {
      insights.push({ type: 'warn', head: 'Carburant', body: `Le carburant représente <strong>${Math.round(fuelPct)}% de tes dépenses</strong>. Regrouper les trajets ou anticiper les pleins peut aider à réduire ce poste.` });
    }

    const travelNightPct = (totCats.travel + totCats.night) / totalDebitsAll * 100;
    if (travelNightPct > 15) {
      insights.push({ type: 'warn', head: 'Voyages & sorties', body: `Voyages et sorties représentent <strong>${Math.round(travelNightPct)}% de tes dépenses</strong>. Prévoir un budget mensuel dédié évite les dépassements imprévus.` });
    }
  }

  // Debt progress
  if (state.debt.total > 0) {
    insights.push({
      type: restant <= 0 ? 'ok' : 'amber',
      head: restant <= 0 ? 'Dette soldée !' : 'Progression remboursement',
      body: restant <= 0
        ? 'Félicitations — ta dette est soldée !'
        : `Il reste <strong>${fmt(restant)} CHF</strong> sur ${fmt(state.debt.total)} CHF (${(totalRepaid/state.debt.total*100).toFixed(1)}% remboursé). À 300 CHF/mois, encore environ <strong>${Math.ceil(restant/300)} mois</strong> pour solder.`
    });

    if (state.debt.rate === 0 && restant > 0) {
      insights.push({ type: 'ok', head: 'Pas d\'intérêts sur la dette', body: 'Chaque franc remboursé est un franc de moins, sans surcoût. Profite de cette situation favorable pour rembourser régulièrement.' });
    }
  }

  el.innerHTML = `<div class="insights-grid">${insights.map(i=>`
    <div class="icard ${i.type==='amber'?'warn':i.type}">
      <div class="icard-head"><span class="dot ${i.type==='amber'?'amber':i.type==='ok'?'green':'red'}"></span>${i.head}</div>
      <div class="icard-body">${i.body}</div>
    </div>`).join('')}</div>`;
}

// ============================================================
// EXPORT — PDF
// ============================================================
function exportPDF() {
  if (state.months.length === 0) { toast('Aucune donnée à exporter.', 'error'); return; }
  // Switch to dashboard so the printed content is meaningful
  goTab('dashboard');
  setTimeout(() => window.print(), 300);
}

// ============================================================
// EXPORT — E-MAIL
// ============================================================
function exportEmail() {
  if (state.months.length === 0) { toast('Aucune donnée à exporter.', 'error'); return; }

  const months = state.months.slice().sort((a,b)=> a.year!==b.year ? a.year-b.year : a.month-b.month);
  const avgC = months.reduce((s,m)=>s+m.credits,0)/months.length;
  const avgD = months.reduce((s,m)=>s+m.debits,0)/months.length;
  const totalRepaid = state.repayments.reduce((s,r)=>s+r.amount,0);
  const restant = state.debt.total > 0 ? Math.max(0, state.debt.total - totalRepaid) : null;

  const sep = '─'.repeat(40);
  const lines = [];

  lines.push('BUDGET TRACKER — RÉSUMÉ');
  lines.push(`Généré le ${new Date().toLocaleDateString('fr-CH')}`);
  lines.push(sep);

  lines.push('');
  lines.push('MOYENNES MENSUELLES');
  lines.push(`  Revenus     : ${fmt(avgC)} CHF`);
  lines.push(`  Dépenses    : ${fmt(avgD)} CHF`);
  lines.push(`  Solde       : ${avgC-avgD>=0?'+':''}${fmt(avgC-avgD)} CHF`);

  if (restant !== null) {
    lines.push('');
    lines.push('DETTE');
    lines.push(`  Total initial : ${fmt(state.debt.total)} CHF`);
    lines.push(`  Remboursé     : ${fmt(totalRepaid)} CHF`);
    lines.push(`  Restant       : ${fmt(restant)} CHF`);
  }

  lines.push('');
  lines.push('HISTORIQUE MENSUEL');
  lines.push(`  ${'Mois'.padEnd(18)} ${'Revenus'.padStart(10)} ${'Dépenses'.padStart(10)} ${'Solde'.padStart(10)}`);
  lines.push(`  ${sep}`);
  months.forEach(m => {
    const label = (MNF[m.month]+' '+m.year).padEnd(18);
    const s = m.credits - m.debits;
    lines.push(`  ${label} ${String(fmt(m.credits)+' CHF').padStart(10)} ${String(fmt(m.debits)+' CHF').padStart(10)} ${String((s>=0?'+':'')+fmt(s)+' CHF').padStart(10)}`);
  });

  lines.push('');
  lines.push(sep);
  lines.push('Données locales — Budget Tracker');

  const subject = encodeURIComponent('Budget Tracker — Résumé du ' + new Date().toLocaleDateString('fr-CH'));
  const body = encodeURIComponent(lines.join('\n'));
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

// ============================================================
// UTILS
// ============================================================
function fmt(n) { return Math.round(n).toLocaleString('fr-CH'); }

// ============================================================
// INIT
// ============================================================
load();
document.getElementById('rDate').valueAsDate = new Date();
const now = new Date();
document.getElementById('fMonth').value = now.getMonth();
document.getElementById('fYear').value = now.getFullYear();
renderDashboard();
