const defaultData = {
  incomeA: 2850,
  incomeB: 2850,
  sharedBills: [
    { name: 'Rent', amount: 1500 },
    { name: 'Electric', amount: 160 },
    { name: 'Internet', amount: 90 },
    { name: 'Food / Gas / Misc', amount: 400 }
  ],
  personalBillsA: [{ name: 'Brandon Car Payment', amount: 435 }],
  personalBillsB: [{ name: 'Alexandria Car Payment', amount: 300 }],
  emergencyGoal: 10000,
  currentEmergency: 0,
  houseGoal: 20000,
  currentHouse: 0,
  splitEvenly: true,
  aggressiveSavings: false
};

const els = {
  incomeA: document.getElementById('incomeA'),
  incomeB: document.getElementById('incomeB'),
  emergencyGoal: document.getElementById('emergencyGoal'),
  currentEmergency: document.getElementById('currentEmergency'),
  houseGoal: document.getElementById('houseGoal'),
  currentHouse: document.getElementById('currentHouse'),
  splitEvenly: document.getElementById('splitEvenly'),
  aggressiveSavings: document.getElementById('aggressiveSavings'),
  sharedBills: document.getElementById('sharedBills'),
  personalBillsA: document.getElementById('personalBillsA'),
  personalBillsB: document.getElementById('personalBillsB'),
  totalIncome: document.getElementById('totalIncome'),
  totalBills: document.getElementById('totalBills'),
  freeCash: document.getElementById('freeCash'),
  recommendedSavings: document.getElementById('recommendedSavings'),
  incomeBar: document.getElementById('incomeBar'),
  billsBar: document.getElementById('billsBar'),
  savingsBar: document.getElementById('savingsBar'),
  spendBar: document.getElementById('spendBar'),
  incomeBarValue: document.getElementById('incomeBarValue'),
  billsBarValue: document.getElementById('billsBarValue'),
  savingsBarValue: document.getElementById('savingsBarValue'),
  spendBarValue: document.getElementById('spendBarValue'),
  advisorText: document.getElementById('advisorText'),
  breakdownA: document.getElementById('breakdownA'),
  breakdownB: document.getElementById('breakdownB'),
  planRows: document.getElementById('planRows'),
  addSharedBillBtn: document.getElementById('addSharedBillBtn'),
  addPersonalABillBtn: document.getElementById('addPersonalABillBtn'),
  addPersonalBBillBtn: document.getElementById('addPersonalBBillBtn'),
  loadSampleBtn: document.getElementById('loadSampleBtn'),
  resetBtn: document.getElementById('resetBtn'),
  exportBtn: document.getElementById('exportBtn'),
  importFile: document.getElementById('importFile'),
  billRowTemplate: document.getElementById('billRowTemplate')
};

function money(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
}

function getSaved() {
  try {
    const raw = localStorage.getItem('financialPlanAdvisorData');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

let state = getSaved() || structuredClone(defaultData);

function saveState() {
  localStorage.setItem('financialPlanAdvisorData', JSON.stringify(state));
}

function createBillRow(listName, item = { name: '', amount: 0 }) {
  const node = els.billRowTemplate.content.firstElementChild.cloneNode(true);
  const nameInput = node.querySelector('.bill-name');
  const amountInput = node.querySelector('.bill-amount');
  const deleteBtn = node.querySelector('.delete-row');

  nameInput.value = item.name || '';
  amountInput.value = item.amount || '';

  const sync = () => {
    const parent = [...node.parentElement.children];
    state[listName] = parent.map((row) => ({
      name: row.querySelector('.bill-name').value.trim(),
      amount: Number(row.querySelector('.bill-amount').value) || 0
    })).filter((row) => row.name || row.amount);
    saveState();
    calculate();
  };

  nameInput.addEventListener('input', sync);
  amountInput.addEventListener('input', sync);
  deleteBtn.addEventListener('click', () => {
    node.remove();
    sync();
  });

  return node;
}

function renderBills() {
  const mappings = [
    ['sharedBills', els.sharedBills],
    ['personalBillsA', els.personalBillsA],
    ['personalBillsB', els.personalBillsB]
  ];

  mappings.forEach(([key, container]) => {
    container.innerHTML = '';
    const rows = state[key].length ? state[key] : [{ name: '', amount: 0 }];
    rows.forEach((item) => container.appendChild(createBillRow(key, item)));
  });
}

function syncFormFromState() {
  ['incomeA', 'incomeB', 'emergencyGoal', 'currentEmergency', 'houseGoal', 'currentHouse'].forEach((key) => {
    els[key].value = state[key] ?? '';
  });
  els.splitEvenly.checked = !!state.splitEvenly;
  els.aggressiveSavings.checked = !!state.aggressiveSavings;
  renderBills();
  calculate();
}

function updateStateFromStaticInputs() {
  ['incomeA', 'incomeB', 'emergencyGoal', 'currentEmergency', 'houseGoal', 'currentHouse'].forEach((key) => {
    state[key] = Number(els[key].value) || 0;
  });
  state.splitEvenly = els.splitEvenly.checked;
  state.aggressiveSavings = els.aggressiveSavings.checked;
  saveState();
  calculate();
}

function sumBills(arr) {
  return arr.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}

function calculate() {
  const incomeA = Number(state.incomeA) || 0;
  const incomeB = Number(state.incomeB) || 0;
  const totalIncome = incomeA + incomeB;
  const sharedBills = sumBills(state.sharedBills);
  const personalA = sumBills(state.personalBillsA);
  const personalB = sumBills(state.personalBillsB);
  const totalBills = sharedBills + personalA + personalB;

  const shareA = state.splitEvenly ? sharedBills / 2 : totalIncome ? (sharedBills * (incomeA / totalIncome)) : 0;
  const shareB = sharedBills - shareA;
  const actualBillsA = shareA + personalA;
  const actualBillsB = shareB + personalB;
  const leftA = incomeA - actualBillsA;
  const leftB = incomeB - actualBillsB;
  const freeCash = leftA + leftB;

  const aggressive = state.aggressiveSavings;
  const efNeed = Math.max(0, state.emergencyGoal - state.currentEmergency);
  const houseNeed = Math.max(0, state.houseGoal - state.currentHouse);

  let emergencySave = Math.min(efNeed, freeCash * (aggressive ? 0.28 : 0.22));
  let invest = Math.max(0, freeCash * (aggressive ? 0.28 : 0.22));
  let houseSave = Math.min(houseNeed, freeCash * (aggressive ? 0.24 : 0.28));
  let lifestyle = Math.max(0, freeCash * (aggressive ? 0.10 : 0.14));
  let extraDebt = Math.max(0, freeCash - emergencySave - invest - houseSave - lifestyle);

  if (freeCash <= 0) {
    emergencySave = 0;
    invest = 0;
    houseSave = 0;
    lifestyle = 0;
    extraDebt = 0;
  }

  const recommendedSavings = emergencySave + invest + houseSave;
  const notAssigned = Math.max(0, freeCash - recommendedSavings - lifestyle - extraDebt);
  extraDebt += notAssigned;

  els.totalIncome.textContent = money(totalIncome);
  els.totalBills.textContent = money(totalBills);
  els.freeCash.textContent = money(freeCash);
  els.recommendedSavings.textContent = money(recommendedSavings);

  setBars(totalIncome, totalBills, recommendedSavings, lifestyle + extraDebt);
  renderBreakdowns({ shareA, shareB, personalA, personalB, leftA, leftB });
  renderPlan({ emergencySave, invest, houseSave, lifestyle, extraDebt, efNeed, houseNeed, freeCash, totalIncome, totalBills });
  renderAdvisor({ freeCash, totalIncome, totalBills, emergencySave, invest, houseSave, lifestyle, extraDebt, leftA, leftB, efNeed, houseNeed });
}

function setBars(totalIncome, totalBills, recommendedSavings, flexible) {
  const safeBase = Math.max(totalIncome, 1);
  const entries = [
    [els.incomeBar, els.incomeBarValue, totalIncome],
    [els.billsBar, els.billsBarValue, totalBills],
    [els.savingsBar, els.savingsBarValue, recommendedSavings],
    [els.spendBar, els.spendBarValue, flexible]
  ];

  entries.forEach(([bar, label, value]) => {
    bar.style.width = `${Math.min(100, (value / safeBase) * 100)}%`;
    label.textContent = money(value);
  });
}

function renderBreakdowns({ shareA, shareB, personalA, personalB, leftA, leftB }) {
  els.breakdownA.innerHTML = '';
  els.breakdownB.innerHTML = '';

  const aRows = [
    `Income: ${money(state.incomeA)}`,
    `Shared bills contribution: ${money(shareA)}`,
    `Personal bills: ${money(personalA)}`,
    `Money left after bills: ${money(leftA)}`
  ];
  const bRows = [
    `Income: ${money(state.incomeB)}`,
    `Shared bills contribution: ${money(shareB)}`,
    `Personal bills: ${money(personalB)}`,
    `Money left after bills: ${money(leftB)}`
  ];

  aRows.forEach((row) => {
    const li = document.createElement('li');
    li.textContent = row;
    els.breakdownA.appendChild(li);
  });
  bRows.forEach((row) => {
    const li = document.createElement('li');
    li.textContent = row;
    els.breakdownB.appendChild(li);
  });
}

function renderPlan({ emergencySave, invest, houseSave, lifestyle, extraDebt }) {
  els.planRows.innerHTML = '';
  [
    ['Emergency fund', emergencySave],
    ['Investing', invest],
    ['House fund', houseSave],
    ['Lifestyle / guilt-free spending', lifestyle],
    ['Extra debt payoff / flex cash', extraDebt]
  ].forEach(([label, value]) => {
    const row = document.createElement('div');
    row.className = 'plan-row';
    row.innerHTML = `<span>${label}</span><strong>${money(value)}</strong>`;
    els.planRows.appendChild(row);
  });
}

function renderAdvisor({ freeCash, totalIncome, totalBills, emergencySave, invest, houseSave, lifestyle, extraDebt, leftA, leftB, efNeed, houseNeed }) {
  const billRatio = totalIncome ? (totalBills / totalIncome) * 100 : 0;
  const monthlyBurn = totalBills;
  const targetEmergencyMonths = monthlyBurn ? (state.currentEmergency / monthlyBurn) : 0;
  const paragraphs = [];

  if (freeCash < 0) {
    paragraphs.push(`<p>You are overspending by <strong>${money(Math.abs(freeCash))}</strong> each month. Cut bills first before focusing on investing.</p>`);
  } else {
    paragraphs.push(`<p>You have about <strong>${money(freeCash)}</strong> of real free cash after bills. That is the money you can safely direct instead of guessing.</p>`);
  }

  if (billRatio > 70) {
    paragraphs.push(`<p>Your bills are eating <strong>${billRatio.toFixed(0)}%</strong> of take-home pay. That is heavy. Your advisor move is to attack debt and reduce recurring costs before chasing bigger investments.</p>`);
  } else if (billRatio > 50) {
    paragraphs.push(`<p>Your bills are around <strong>${billRatio.toFixed(0)}%</strong> of take-home pay. That is workable, but not lazy-money territory yet. Keep fixed costs tight.</p>`);
  } else {
    paragraphs.push(`<p>Your bills are only about <strong>${billRatio.toFixed(0)}%</strong> of take-home pay. That is strong. You have room to build wealth faster.</p>`);
  }

  paragraphs.push(`<p>Recommended this month: <strong>${money(emergencySave)}</strong> to emergency savings, <strong>${money(invest)}</strong> to investing, <strong>${money(houseSave)}</strong> to the house fund, and <strong>${money(extraDebt)}</strong> to extra debt payoff or extra cushion.</p>`);

  if (efNeed > 0) {
    paragraphs.push(`<p>Your emergency fund is still short by <strong>${money(efNeed)}</strong>. Right now you cover about <strong>${targetEmergencyMonths.toFixed(1)}</strong> months of bills. Build that up before getting too flashy.</p>`);
  } else {
    paragraphs.push(`<p>Your emergency fund goal is covered. Nice. That means more future cash can tilt toward investing or house savings.</p>`);
  }

  if (houseNeed > 0) {
    paragraphs.push(`<p>Your house fund still needs <strong>${money(houseNeed)}</strong>. At this pace, you can see progress without starving the rest of your life.</p>`);
  }

  paragraphs.push(`<p>After the split, Brandon keeps about <strong>${money(leftA)}</strong> after bills and Alexandria keeps about <strong>${money(leftB)}</strong> after bills. Clean split, less drama.</p>`);
  paragraphs.push(`<p>Guilt-free spending is set at <strong>${money(lifestyle)}</strong> so you do not turn the plan into financial prison.</p>`);

  els.advisorText.innerHTML = paragraphs.join('');
}

function addRow(listName, container) {
  container.appendChild(createBillRow(listName, { name: '', amount: 0 }));
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'financial-plan-advisor-data.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      state = { ...structuredClone(defaultData), ...JSON.parse(reader.result) };
      saveState();
      syncFormFromState();
    } catch {
      alert('That file could not be imported.');
    }
  };
  reader.readAsText(file);
}

els.addSharedBillBtn.addEventListener('click', () => addRow('sharedBills', els.sharedBills));
els.addPersonalABillBtn.addEventListener('click', () => addRow('personalBillsA', els.personalBillsA));
els.addPersonalBBillBtn.addEventListener('click', () => addRow('personalBillsB', els.personalBillsB));
els.loadSampleBtn.addEventListener('click', () => {
  state = structuredClone(defaultData);
  saveState();
  syncFormFromState();
});
els.resetBtn.addEventListener('click', () => {
  state = structuredClone(defaultData);
  localStorage.removeItem('financialPlanAdvisorData');
  syncFormFromState();
});
els.exportBtn.addEventListener('click', exportData);
els.importFile.addEventListener('change', (e) => {
  const [file] = e.target.files || [];
  if (file) importData(file);
});
['incomeA', 'incomeB', 'emergencyGoal', 'currentEmergency', 'houseGoal', 'currentHouse'].forEach((key) => {
  els[key].addEventListener('input', updateStateFromStaticInputs);
});
[els.splitEvenly, els.aggressiveSavings].forEach((el) => el.addEventListener('change', updateStateFromStaticInputs));

syncFormFromState();
