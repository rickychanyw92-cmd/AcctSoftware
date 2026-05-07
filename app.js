const STORAGE_KEY = "ledgerlite:v1";
const MONEY = new Intl.NumberFormat("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ACCOUNT_TYPES = {
  Asset: ["Current Assets", "Non-current Assets"],
  Liability: ["Current Liabilities", "Non-current Liabilities"],
  Equity: ["Share Capital", "Retained Earnings", "Other Equity"],
  Income: ["Revenue"],
  "Cost of Sales": ["Cost of Sales"],
  "Other Income": ["Other Income"],
  Expense: ["Operating Expenses", "Administrative Expenses", "Finance Costs"],
  Tax: ["Tax Expense"]
};

const NORMAL_BALANCE = {
  Asset: "debit",
  Expense: "debit",
  "Cost of Sales": "debit",
  Tax: "debit",
  Liability: "credit",
  Equity: "credit",
  Income: "credit",
  "Other Income": "credit"
};

const SINGAPORE_BANKS = [
  "DBS Bank",
  "POSB",
  "OCBC Bank",
  "UOB",
  "Maybank Singapore",
  "Standard Chartered Singapore",
  "HSBC Singapore",
  "Citibank Singapore",
  "Bank of China Singapore",
  "CIMB Bank Singapore",
  "RHB Bank Singapore",
  "Hong Leong Finance",
  "Singapura Finance",
  "State Bank of India Singapore",
  "ICICI Bank Singapore",
  "BNP Paribas Singapore",
  "Deutsche Bank Singapore",
  "J.P. Morgan Singapore",
  "ANZ Singapore",
  "MUFG Bank Singapore"
];

let state = loadState();
let activeView = "dashboard";
let pendingJournalStatus = "draft";

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function toAmount(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
}

function money(value) {
  const amount = Math.abs(toAmount(value)) < 0.005 ? 0 : value;
  return MONEY.format(amount);
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return migrateState(JSON.parse(saved));
  return sampleState();
}

function migrateState(saved) {
  return {
    ...saved,
    bankStatements: saved.bankStatements || [],
    bankTransactions: (saved.bankTransactions || []).map((transaction) => ({
      suggestedCategory: "",
      suggestedAccountId: "",
      approvedAt: "",
      ...transaction
    }))
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function addAudit(action, entity, details) {
  state.auditLogs.unshift({
    id: uid("audit"),
    at: new Date().toISOString(),
    action,
    entity,
    details
  });
}

function sampleState() {
  const accounts = [
    account("1000", "Cash at Bank", "Asset", "Current Assets", 18000, 0),
    account("1100", "Accounts Receivable", "Asset", "Current Assets", 6000, 0),
    account("1500", "Computer Equipment", "Asset", "Non-current Assets", 4200, 0),
    account("2000", "Accounts Payable", "Liability", "Current Liabilities", 0, 3500),
    account("2100", "GST Payable", "Liability", "Current Liabilities", 0, 900),
    account("3000", "Share Capital", "Equity", "Share Capital", 0, 10000),
    account("3100", "Retained Earnings", "Equity", "Retained Earnings", 0, 13800),
    account("4000", "Sales Revenue", "Income", "Revenue", 0, 0),
    account("5000", "Cost of Sales", "Cost of Sales", "Cost of Sales", 0, 0),
    account("6100", "Rent Expense", "Expense", "Operating Expenses", 0, 0),
    account("6200", "Salary Expense", "Expense", "Administrative Expenses", 0, 0),
    account("7100", "Income Tax Expense", "Tax", "Tax Expense", 0, 0)
  ];
  const byCode = Object.fromEntries(accounts.map((item) => [item.code, item.id]));
  const journals = [
    journal("2026-01-15", "JE-0001", "Sales invoice recorded", "posted", [
      line(byCode["1100"], "Customer invoice", 8000, 0),
      line(byCode["4000"], "Customer invoice", 0, 8000)
    ]),
    journal("2026-01-22", "JE-0002", "Supplier bill for inventory sold", "posted", [
      line(byCode["5000"], "Cost of sales", 2600, 0),
      line(byCode["2000"], "Supplier bill", 0, 2600)
    ]),
    journal("2026-02-01", "JE-0003", "Monthly office rent", "posted", [
      line(byCode["6100"], "Rent", 1400, 0),
      line(byCode["1000"], "Rent paid", 0, 1400)
    ]),
    journal("2026-02-28", "JE-0004", "Monthly payroll", "posted", [
      line(byCode["6200"], "Payroll", 3500, 0),
      line(byCode["1000"], "Payroll paid", 0, 3500)
    ])
  ];

  return {
    company: {
      name: "Sample Trading Pte. Ltd.",
      registrationNumber: "202600001A",
      currency: "SGD",
      fyStart: "2026-01-01",
      fyEnd: "2026-12-31",
      taxNumber: "M90000001A"
    },
    accounts,
    journals,
    bankStatements: [],
    bankTransactions: [],
    periods: [],
    auditLogs: [
      {
        id: uid("audit"),
        at: new Date().toISOString(),
        action: "loaded",
        entity: "sample data",
        details: "Initial sample accounting records were created."
      }
    ]
  };
}

function account(code, name, type, category, openingDebit, openingCredit) {
  return {
    id: uid("acct"),
    code,
    name,
    type,
    category,
    parentId: "",
    normalBalance: NORMAL_BALANCE[type],
    openingDebit,
    openingCredit,
    active: true
  };
}

function journal(date, reference, description, status, lines) {
  return { id: uid("je"), date, reference, description, status, lines, createdAt: new Date().toISOString() };
}

function line(accountId, description, debit, credit) {
  return { id: uid("line"), accountId, description, debit, credit };
}

function init() {
  populateAccountTypeControls();
  bindNavigation();
  bindCompanyForm();
  bindAccountForm();
  bindJournalForm();
  bindInvoiceForms();
  bindBanking();
  bindReports();
  bindMaintenance();
  setDefaultReportDates();
  renderAll();
}

function bindNavigation() {
  $$(".nav-item").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });
}

function showView(view) {
  activeView = view;
  $$(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  $$(".view").forEach((panel) => panel.classList.remove("active"));
  $(`#${camelView(view)}View`).classList.add("active");
  const titles = {
    dashboard: ["Dashboard", "Accounting reports generated from posted double-entry journals."],
    company: ["Company", "Company profile and financial year settings."],
    accounts: ["Chart of Accounts", "Account classifications that drive the reports."],
    journals: ["Journal Entries", "Draft, post, and void balanced accounting journals."],
    banking: ["Banking", "Upload bank statements, review transactions, and create journals."],
    "trial-balance": ["Trial Balance", "All account balances, with total debits equal to total credits."],
    "profit-loss": ["Profit & Loss", "Income and expenses for the selected period."],
    "balance-sheet": ["Balance Sheet", "Assets, liabilities, and equity as at a selected date."],
    periods: ["Period Locking", "Lock closed months to protect posted results."],
    audit: ["Audit Trail", "Trace important changes and control actions."]
  };
  $("#viewTitle").textContent = titles[view][0];
  $("#viewSubtitle").textContent = titles[view][1];
  renderAll();
}

function camelView(view) {
  return view.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

function populateAccountTypeControls() {
  const typeSelect = $("#accountForm select[name='type']");
  typeSelect.innerHTML = Object.keys(ACCOUNT_TYPES).map((type) => `<option>${type}</option>`).join("");
  updateCategoryOptions();
  typeSelect.addEventListener("change", updateCategoryOptions);
}

function updateCategoryOptions() {
  const type = $("#accountForm select[name='type']").value;
  $("#accountForm select[name='category']").innerHTML = ACCOUNT_TYPES[type].map((cat) => `<option>${cat}</option>`).join("");
}

function bindCompanyForm() {
  $("#companyForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    state.company = { ...data, currency: data.currency.toUpperCase() };
    addAudit("updated", "company", `Company profile saved for ${state.company.name}.`);
    saveState();
    renderAll();
  });
}

function bindAccountForm() {
  $("#accountForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const duplicate = state.accounts.find((item) => item.code === data.code && item.id !== data.id);
    if (duplicate) return alert("Account code must be unique.");
    const saved = {
      id: data.id || uid("acct"),
      code: data.code.trim(),
      name: data.name.trim(),
      type: data.type,
      category: data.category,
      parentId: data.parentId || "",
      normalBalance: NORMAL_BALANCE[data.type],
      openingDebit: toAmount(data.openingDebit),
      openingCredit: toAmount(data.openingCredit),
      active: Boolean(data.active)
    };
    if (saved.openingDebit > 0 && saved.openingCredit > 0) return alert("Opening balance can be debit or credit, not both.");
    const index = state.accounts.findIndex((item) => item.id === saved.id);
    if (index >= 0) state.accounts[index] = saved;
    else state.accounts.push(saved);
    addAudit(index >= 0 ? "updated" : "created", "account", `${saved.code} ${saved.name}`);
    clearAccountForm();
    saveState();
    renderAll();
  });
  $("#clearAccountBtn").addEventListener("click", clearAccountForm);
}

function bindJournalForm() {
  $("#addLineBtn").addEventListener("click", () => addJournalLine());
  $("#clearJournalBtn").addEventListener("click", clearJournalForm);
  $("#journalForm").addEventListener("click", (event) => {
    const submit = event.target.closest("[data-save-status]");
    if (submit) pendingJournalStatus = submit.dataset.saveStatus;
  });
  $("#journalForm").addEventListener("submit", (event) => {
    event.preventDefault();
    saveJournal(pendingJournalStatus);
  });
  $("#journalLineRows").addEventListener("input", updateJournalTotals);
  $("#journalLineRows").addEventListener("change", updateJournalTotals);
  clearJournalForm();
}

function bindInvoiceForms() {
  $("#salesInvoiceForm").addEventListener("submit", (event) => {
    event.preventDefault();
    postSalesInvoice(Object.fromEntries(new FormData(event.currentTarget)));
    event.currentTarget.reset();
    setInvoiceFormDefaults();
  });
  $("#supplierInvoiceForm").addEventListener("submit", (event) => {
    event.preventDefault();
    postSupplierInvoice(Object.fromEntries(new FormData(event.currentTarget)));
    event.currentTarget.reset();
    setInvoiceFormDefaults();
  });
}

function bindBanking() {
  $("#downloadSampleBankCsvBtn").addEventListener("click", downloadSampleBankCsv);
  $("#massApproveBankBtn").addEventListener("click", massApproveBankTransactions);
  $("#bankUploadForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const bankName = form.elements.bankName.value;
    const bankAccountId = form.elements.bankAccountId.value;
    const file = form.elements.statementFile.files[0];
    if (!bankName || !bankAccountId || !file) return;
    await uploadBankStatement(file, bankName, bankAccountId);
    form.reset();
    saveState();
    renderAll();
  });
}

function downloadSampleBankCsv() {
  const rows = [
    ["Date", "Description", "Debit", "Credit"],
    ["01/03/2026", "DBS BANK CHARGE", "18.00", ""],
    ["03/03/2026", "CUSTOMER RECEIPT INV-1024", "", "2500.00"],
    ["08/03/2026", "OFFICE RENT PAYMENT", "1400.00", ""],
    ["15/03/2026", "SUPPLIER BILL PAYMENT", "860.00", ""]
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "sample-bank-statement.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function bindReports() {
  ["tbAsAt", "tbShowZero", "plFrom", "plTo", "bsAsAt"].forEach((id) => {
    $(`#${id}`).addEventListener("change", renderReports);
  });
  $$("[data-export]").forEach((button) => {
    button.addEventListener("click", () => exportReport(button.dataset.export));
  });
}

function bindMaintenance() {
  $("#seedDataBtn").addEventListener("click", () => {
    if (!confirm("Reload sample data and replace the current workspace data?")) return;
    state = sampleState();
    saveState();
    setDefaultReportDates();
    renderAll();
  });
  $("#resetBtn").addEventListener("click", () => {
    if (!confirm("Reset all local data?")) return;
    localStorage.removeItem(STORAGE_KEY);
    state = { ...sampleState(), accounts: [], journals: [], periods: [], auditLogs: [] };
    saveState();
    renderAll();
  });
  $("#generatePeriodsBtn").addEventListener("click", () => {
    state.periods = generateMonthlyPeriods(state.company.fyStart, state.company.fyEnd);
    addAudit("generated", "periods", "Monthly accounting periods generated.");
    saveState();
    renderAll();
  });
}

function setDefaultReportDates() {
  $("#tbAsAt").value = state.company.fyEnd;
  $("#bsAsAt").value = state.company.fyEnd;
  $("#plFrom").value = state.company.fyStart;
  $("#plTo").value = state.company.fyEnd;
}

function renderAll() {
  renderCompanyForm();
  renderAccounts();
  renderJournalAccountOptions();
  renderJournals();
  renderBanking();
  renderPeriods();
  renderAudit();
  renderReports();
  renderDashboard();
  renderInvoiceForms();
}

function renderCompanyForm() {
  const form = $("#companyForm");
  Object.entries(state.company).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = value;
  });
}

function renderAccounts() {
  const rows = state.accounts
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((item) => `
      <tr>
        <td>${escapeHtml(item.code)}</td>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.type)}</td>
        <td>${escapeHtml(item.category)}</td>
        <td><span class="status ${item.active ? "active-status" : "inactive"}">${item.active ? "Active" : "Inactive"}</span></td>
        <td><button class="secondary" type="button" onclick="editAccount('${item.id}')">Edit</button></td>
      </tr>
    `)
    .join("");
  $("#accountRows").innerHTML = rows || `<tr><td class="empty" colspan="6">No accounts yet.</td></tr>`;
  const parentSelect = $("#accountForm select[name='parentId']");
  parentSelect.innerHTML = `<option value="">None</option>${state.accounts.map((item) => `<option value="${item.id}">${escapeHtml(item.code)} ${escapeHtml(item.name)}</option>`).join("")}`;
}

function editAccount(id) {
  const account = state.accounts.find((item) => item.id === id);
  if (!account) return;
  const form = $("#accountForm");
  Object.entries(account).forEach(([key, value]) => {
    if (!form.elements[key]) return;
    if (form.elements[key].type === "checkbox") form.elements[key].checked = Boolean(value);
    else form.elements[key].value = value;
  });
  updateCategoryOptions();
  form.elements.category.value = account.category;
  $("#accountFormTitle").textContent = "Edit Account";
}

function clearAccountForm() {
  $("#accountForm").reset();
  $("#accountForm input[name='id']").value = "";
  $("#accountForm input[name='openingDebit']").value = "0";
  $("#accountForm input[name='openingCredit']").value = "0";
  $("#accountForm input[name='active']").checked = true;
  $("#accountFormTitle").textContent = "New Account";
  updateCategoryOptions();
}

function renderJournalAccountOptions() {
  $$(".line-account").forEach(fillAccountSelect);
}

function fillAccountSelect(select, selected = select.value) {
  const options = state.accounts
    .filter((item) => item.active || item.id === selected)
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((item) => `<option value="${item.id}">${escapeHtml(item.code)} ${escapeHtml(item.name)}</option>`)
    .join("");
  select.innerHTML = `<option value="">Select account</option>${options}`;
  select.value = selected;
}

function addJournalLine(existing = {}) {
  const template = $("#journalLineTemplate").content.cloneNode(true);
  const row = template.querySelector("tr");
  fillAccountSelect(row.querySelector(".line-account"), existing.accountId || "");
  row.querySelector(".line-description").value = existing.description || "";
  row.querySelector(".line-debit").value = existing.debit || 0;
  row.querySelector(".line-credit").value = existing.credit || 0;
  row.querySelector(".remove-line").addEventListener("click", () => {
    row.remove();
    updateJournalTotals();
  });
  $("#journalLineRows").append(row);
  updateJournalTotals();
}

function clearJournalForm() {
  $("#journalForm").reset();
  $("#journalForm input[name='date']").value = today();
  $("#journalForm input[name='id']").value = "";
  $("#journalLineRows").innerHTML = "";
  addJournalLine();
  addJournalLine();
}

function getJournalFormLines() {
  return $$("#journalLineRows tr")
    .map((row) => ({
      id: uid("line"),
      accountId: row.querySelector(".line-account").value,
      description: row.querySelector(".line-description").value.trim(),
      debit: toAmount(row.querySelector(".line-debit").value),
      credit: toAmount(row.querySelector(".line-credit").value)
    }))
    .filter((item) => item.accountId || item.debit || item.credit);
}

function updateJournalTotals() {
  const lines = getJournalFormLines();
  const totals = lines.reduce((sum, item) => {
    sum.debit += toAmount(item.debit);
    sum.credit += toAmount(item.credit);
    return sum;
  }, { debit: 0, credit: 0 });
  $("#journalDebitTotal").textContent = money(totals.debit);
  $("#journalCreditTotal").textContent = money(totals.credit);
  const balanced = Math.abs(totals.debit - totals.credit) < 0.005 && totals.debit > 0;
  $("#journalBalanceHint").textContent = balanced ? "This journal is balanced and ready to post." : "Debits and credits must balance before posting.";
}

function saveJournal(status) {
  const form = $("#journalForm");
  const data = Object.fromEntries(new FormData(form));
  const lines = getJournalFormLines();
  if (lines.length < 2) return alert("A journal needs at least two lines.");
  if (lines.some((item) => !item.accountId)) return alert("Each journal line needs an account.");
  if (lines.some((item) => item.debit > 0 && item.credit > 0)) return alert("A line cannot have both debit and credit.");
  const totals = lines.reduce((sum, item) => {
    sum.debit += item.debit;
    sum.credit += item.credit;
    return sum;
  }, { debit: 0, credit: 0 });
  if (Math.abs(totals.debit - totals.credit) >= 0.005) return alert("Total debit must equal total credit.");
  if (status === "posted" && isDateLocked(data.date)) return alert("This accounting period is locked.");
  const reference = data.reference.trim() || nextJournalReference();
  const saved = {
    id: data.id || uid("je"),
    date: data.date,
    reference,
    description: data.description.trim(),
    status,
    lines,
    createdAt: new Date().toISOString()
  };
  const index = state.journals.findIndex((item) => item.id === saved.id);
  if (index >= 0) state.journals[index] = saved;
  else state.journals.push(saved);
  addAudit(status === "posted" ? "posted" : "saved", "journal", `${reference} ${saved.description}`);
  clearJournalForm();
  saveState();
  renderAll();
}

function nextJournalReference() {
  const count = state.journals.length + 1;
  return `JE-${String(count).padStart(4, "0")}`;
}

function nextInvoiceReference(prefix) {
  const count = state.journals.filter((item) => item.reference.startsWith(`${prefix}-`)).length + 1;
  return `${prefix}-${String(count).padStart(4, "0")}`;
}

function postSalesInvoice(data) {
  const amount = toAmount(data.amount);
  if (amount <= 0) return alert("Sales invoice amount must be greater than zero.");
  if (isDateLocked(data.date)) return alert("This accounting period is locked.");
  const reference = data.reference.trim() || nextInvoiceReference("SI");
  const description = `Sales invoice: ${data.customer.trim()}`;
  state.journals.push(journal(data.date, reference, description, "posted", [
    line(data.receivableAccountId, description, amount, 0),
    line(data.incomeAccountId, description, 0, amount)
  ]));
  addAudit("posted", "sales invoice", `${reference} ${description}`);
  saveState();
  renderAll();
}

function postSupplierInvoice(data) {
  const amount = toAmount(data.amount);
  if (amount <= 0) return alert("Supplier invoice amount must be greater than zero.");
  if (isDateLocked(data.date)) return alert("This accounting period is locked.");
  const reference = data.reference.trim() || nextInvoiceReference("PI");
  const description = `Supplier invoice: ${data.supplier.trim()}`;
  state.journals.push(journal(data.date, reference, description, "posted", [
    line(data.expenseAccountId, description, amount, 0),
    line(data.payableAccountId, description, 0, amount)
  ]));
  addAudit("posted", "supplier invoice", `${reference} ${description}`);
  saveState();
  renderAll();
}

function renderJournals() {
  const rows = [...state.journals]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((item) => {
      const debit = item.lines.reduce((sum, lineItem) => sum + lineItem.debit, 0);
      const voidButton = item.status !== "voided" ? `<button class="danger" type="button" onclick="voidJournal('${item.id}')">Void</button>` : "";
      return `
        <tr>
          <td>${item.date}</td>
          <td>${escapeHtml(item.reference)}</td>
          <td>${escapeHtml(item.description)}</td>
          <td><span class="status ${item.status}">${item.status}</span></td>
          <td class="num">${money(debit)}</td>
          <td>${voidButton}</td>
        </tr>
      `;
    })
    .join("");
  $("#journalRows").innerHTML = rows || `<tr><td class="empty" colspan="6">No journals yet.</td></tr>`;
}

function voidJournal(id) {
  const journalEntry = state.journals.find((item) => item.id === id);
  if (!journalEntry || !confirm(`Void ${journalEntry.reference}?`)) return;
  journalEntry.status = "voided";
  addAudit("voided", "journal", `${journalEntry.reference} ${journalEntry.description}`);
  saveState();
  renderAll();
}

async function uploadBankStatement(file, bankName, bankAccountId) {
  const extension = file.name.split(".").pop().toLowerCase();
  const statement = {
    id: uid("stmt"),
    fileName: file.name,
    bankName,
    fileType: extension,
    uploadedAt: new Date().toISOString(),
    bankAccountId,
    status: "uploaded",
    rowCount: 0,
    note: ""
  };

  try {
    const parsedRows = await extractStatementRows(file, extension);
    const transactions = parsedRows.map((row) => buildBankTransaction(row, statement.id, bankAccountId));
    statement.status = "parsed";
    statement.rowCount = transactions.length;
    statement.note = transactions.length ? "Transactions parsed and ready for account-code review." : "No transaction rows were detected.";
    state.bankTransactions.unshift(...transactions);
  } catch (error) {
    statement.status = "needs parser";
    statement.note = error.message;
  }

  state.bankStatements.unshift(statement);
  addAudit("uploaded", "bank statement", `${bankName} - ${file.name} (${statement.rowCount} parsed rows)`);
}

function buildBankTransaction(row, statementId, bankAccountId) {
  const suggestion = suggestBankCoding(row);
  const suggestedAccountId = suggestion.accountId === bankAccountId ? "" : suggestion.accountId;
  return {
    id: uid("bank"),
    statementId,
    bankAccountId,
    date: row.date,
    description: row.description,
    amount: row.amount,
    status: "review",
    suggestedCategory: suggestion.category,
    suggestedAccountId,
    offsetAccountId: suggestedAccountId,
    approvedAt: "",
    journalId: ""
  };
}

async function extractStatementRows(file, extension) {
  if (["csv", "txt", "tsv"].includes(extension)) {
    return parseDelimitedStatement(await file.text());
  }
  if (["xlsx", "xls"].includes(extension)) {
    return parseExcelStatement(await file.arrayBuffer());
  }
  if (extension === "pdf") {
    return parsePdfStatement(await file.arrayBuffer(), file.name);
  }
  throw new Error("Unsupported file type. Upload CSV, Excel, or PDF statements.");
}

function parseDelimitedStatement(text) {
  const rows = parseCsvRows(text).filter((row) => row.some((cell) => cell.trim()));
  return parseStatementGrid(rows);
}

function parseExcelStatement(arrayBuffer) {
  if (!window.XLSX) throw new Error("Excel parser did not load. Check the internet connection and reload the app.");
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false, defval: "" });
  return parseStatementGrid(rows.map((row) => row.map((cell) => String(cell).trim())));
}

async function parsePdfStatement(arrayBuffer, fileName) {
  if (!window.pdfjsLib) throw new Error("PDF parser did not load. Check the internet connection and reload the app.");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const lines = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const grouped = new Map();
    content.items.forEach((item) => {
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      if (!grouped.has(y)) grouped.set(y, []);
      grouped.get(y).push({ x, text: item.str });
    });
    [...grouped.entries()]
      .sort((a, b) => b[0] - a[0])
      .forEach(([, items]) => {
        const lineText = items.sort((a, b) => a.x - b.x).map((item) => item.text).join(" ").replace(/\s+/g, " ").trim();
        if (lineText) lines.push(lineText);
      });
  }
  return parsePdfStatementLines(lines, inferYearFromText(`${fileName} ${lines.slice(0, 20).join(" ")}`));
}

function parseStatementGrid(rows) {
  if (rows.length < 2) return [];
  const headerIndex = findStatementHeaderIndex(rows);
  if (headerIndex < 0) return [];
  const headers = rows[headerIndex].map((header) => normalizeHeader(header));
  return rows.slice(headerIndex + 1).map((cells) => {
    const record = Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""]));
    const date = normalizeDate(pick(record, ["date", "transaction date", "posting date", "value date"]));
    const description = buildStatementDescription(headers, cells);
    const amountValue = pick(record, ["amount", "transaction amount", "net amount"]);
    const debitValue = pick(record, ["debit", "withdrawal", "paid out", "payment"]);
    const creditValue = pick(record, ["credit", "deposit", "paid in", "receipt"]);
    let amount = toAmount(cleanAmount(amountValue));
    if (!amount && (debitValue || creditValue)) amount = toAmount(cleanAmount(creditValue)) - toAmount(cleanAmount(debitValue));
    return { date, description, amount };
  }).filter((row) => row.date && Math.abs(row.amount) >= 0.005);
}

function buildStatementDescription(headers, cells) {
  const descriptionHeaders = [
    "description",
    "details",
    "transaction",
    "transaction details",
    "transaction description",
    "narrative",
    "memo",
    "reference",
    "remarks",
    "particulars",
    "payee",
    "payer"
  ];
  const excludedHeaders = new Set([
    "date",
    "transaction date",
    "posting date",
    "value date",
    "amount",
    "transaction amount",
    "net amount",
    "debit",
    "withdrawal",
    "paid out",
    "payment",
    "credit",
    "deposit",
    "paid in",
    "receipt",
    "balance",
    "running balance"
  ]);
  const primary = headers
    .map((header, index) => ({ header, value: String(cells[index] || "").trim() }))
    .filter((item) => item.value && descriptionHeaders.includes(item.header))
    .map((item) => item.value);
  const supporting = headers
    .map((header, index) => ({ header, value: String(cells[index] || "").trim() }))
    .filter((item) => item.value && !excludedHeaders.has(item.header) && !descriptionHeaders.includes(item.header) && Number.isNaN(Number(cleanAmount(item.value))))
    .map((item) => item.value);
  const combined = [...primary, ...supporting].filter(Boolean);
  return [...new Set(combined)].join(" | ") || "Bank transaction";
}

function findStatementHeaderIndex(rows) {
  return rows.findIndex((row) => {
    const headers = row.map((cell) => normalizeHeader(cell));
    const hasDate = headers.some((header) => ["date", "transaction date", "posting date", "value date"].includes(header));
    const hasDescription = headers.some((header) => ["description", "details", "transaction", "transaction details", "transaction description", "narrative", "memo", "reference", "remarks", "particulars", "payee", "payer"].includes(header));
    const hasAmount = headers.some((header) => ["amount", "transaction amount", "net amount", "debit", "withdrawal", "paid out", "payment", "credit", "deposit", "paid in", "receipt"].includes(header));
    return hasDate && (hasDescription || hasAmount);
  });
}

function parsePdfStatementLines(lines, fallbackYear) {
  const parsed = [];
  const datePattern = /(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?|\d{1,2}\s+[A-Za-z]{3,9}(?:\s+\d{2,4})?|\d{4}-\d{2}-\d{2})/;
  const amountPattern = /-?\(?\d+(?:,\d{3})*(?:\.\d{2})\)?-?/g;
  lines.forEach((lineText) => {
    const dateMatch = lineText.match(datePattern);
    const amountMatches = lineText.match(amountPattern) || [];
    if (!dateMatch || !amountMatches.length) return;
    const amountToken = amountMatches.length >= 2 ? amountMatches[amountMatches.length - 2] : amountMatches[amountMatches.length - 1];
    let amount = toAmount(cleanAmount(amountToken));
    const lower = lineText.toLowerCase();
    const unsigned = !/[()-]/.test(amountToken);
    if (unsigned && !/(credit|deposit|interest received|receipt|salary|sales|refund|cr\b)/i.test(lower)) amount = -Math.abs(amount);
    const description = lineText
      .replace(dateMatch[0], "")
      .replaceAll(amountToken, "")
      .replace(amountMatches[amountMatches.length - 1], "")
      .replace(/\s+/g, " ")
      .trim() || "Bank transaction";
    parsed.push({ date: normalizeDate(dateMatch[0], fallbackYear), description, amount });
  });
  return parsed.filter((row) => row.date && Math.abs(row.amount) >= 0.005);
}

function inferYearFromText(text) {
  const fourDigit = String(text).match(/\b(20\d{2})\b/);
  if (fourDigit) return fourDigit[1];
  const companyYear = String(state.company.fyStart || "").slice(0, 4);
  return companyYear || String(new Date().getFullYear());
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if ((char === "," || char === "\t") && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if (char === "\n" && !quoted) {
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell.trim());
  rows.push(row);
  return rows;
}

function normalizeHeader(value) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function pick(record, names) {
  for (const name of names) {
    if (record[name]) return record[name];
  }
  return "";
}

function cleanAmount(value) {
  const cleaned = String(value || "").replace(/[,$\s]/g, "").replace(/[()]/g, (char) => char === "(" ? "-" : "");
  return cleaned.endsWith("-") ? `-${cleaned.slice(0, -1)}` : cleaned;
}

function normalizeDate(value, fallbackYear = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const named = raw.match(/^(\d{1,2})\s+([A-Za-z]{3,9})(?:\s+(\d{2,4}))?$/);
  if (named) {
    const parsedMonth = new Date(`${named[2]} 1, 2000`).getMonth() + 1;
    if (parsedMonth) {
      const rawYear = named[3] || fallbackYear;
      const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
      return `${year}-${String(parsedMonth).padStart(2, "0")}-${named[1].padStart(2, "0")}`;
    }
  }
  const slash = raw.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
  if (slash) {
    const rawYear = slash[3] || fallbackYear;
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    return `${year}-${slash[2].padStart(2, "0")}-${slash[1].padStart(2, "0")}`;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function suggestBankCoding(row) {
  const text = row.description.toLowerCase();
  const isMoneyIn = row.amount > 0;
  const rules = [
    { terms: ["salary", "payroll", "cpf", "wages"], category: "Expenses", account: "Salary Expense" },
    { terms: ["rent", "lease"], category: "Expenses", account: "Rent Expense" },
    { terms: ["bank charge", "service fee", "admin fee", "charges", "fee"], category: "Expenses", account: "Rent Expense" },
    { terms: ["interest", "loan", "finance"], category: "Expenses", account: isMoneyIn ? "Sales Revenue" : "Rent Expense" },
    { terms: ["telco", "singtel", "starhub", "m1", "utilities", "sp services", "electricity", "water"], category: "Expenses", account: "Rent Expense" },
    { terms: ["insurance"], category: "Expenses", account: "Rent Expense" },
    { terms: ["tax", "iras", "income tax"], category: "Expenses", account: "Income Tax Expense" },
    { terms: ["customer", "invoice", "receipt", "sales"], category: "Revenue / Receivables", account: isMoneyIn ? "Sales Revenue" : "Accounts Receivable" },
    { terms: ["supplier", "vendor", "bill", "purchase"], category: "Liabilities / Expenses", account: isMoneyIn ? "Accounts Payable" : "Cost of Sales" },
    { terms: ["gst"], category: "Balance Sheet", account: "GST Payable" },
    { terms: ["transfer", "fund transfer", "own account"], category: "Balance Sheet", account: "Cash at Bank" },
    { terms: ["director", "shareholder", "capital"], category: "Balance Sheet", account: "Share Capital" },
    { terms: ["equipment", "computer", "laptop", "asset"], category: "Balance Sheet", account: "Computer Equipment" }
  ];
  const matched = rules.find((rule) => rule.terms.some((term) => text.includes(term)));
  const fallback = isMoneyIn
    ? { category: "Revenue / Balance Sheet", account: "Sales Revenue" }
    : { category: "Expenses / Balance Sheet", account: "Rent Expense" };
  const selected = matched || fallback;
  const accountItem = findAccountByName(selected.account) || findAccountByCategory(selected.category, isMoneyIn);
  return {
    category: accountItem ? `${accountItem.type} - ${accountItem.category}` : selected.category,
    accountId: accountItem ? accountItem.id : ""
  };
}

function findAccountByName(name) {
  return state.accounts.find((item) => item.name.toLowerCase() === name.toLowerCase() && item.active);
}

function findAccountByCategory(category, isMoneyIn) {
  if (category.includes("Balance Sheet")) return state.accounts.find((item) => ["Asset", "Liability", "Equity"].includes(item.type) && item.active);
  if (isMoneyIn) return state.accounts.find((item) => ["Income", "Other Income"].includes(item.type) && item.active);
  return state.accounts.find((item) => ["Expense", "Cost of Sales", "Tax"].includes(item.type) && item.active);
}

function renderBanking() {
  const bankNameSelect = $("#bankUploadForm select[name='bankName']");
  const bankSelect = $("#bankUploadForm select[name='bankAccountId']");
  const bankAccounts = state.accounts.filter((item) => item.type === "Asset" && item.active);
  bankNameSelect.innerHTML = `<option value="">Select bank</option>${SINGAPORE_BANKS.map((bank) => `<option value="${escapeHtml(bank)}">${escapeHtml(bank)}</option>`).join("")}`;
  bankSelect.innerHTML = bankAccounts.map((item) => `<option value="${item.id}">${escapeHtml(item.code)} ${escapeHtml(item.name)}</option>`).join("");
  renderStatements();
  renderBankTransactions();
}

function renderStatements() {
  $("#statementRows").innerHTML = state.bankStatements.map((statement) => `
    <tr>
      <td>${escapeHtml(statement.fileName)}</td>
      <td>${escapeHtml(statement.bankName || "Not selected")}</td>
      <td>${escapeHtml(statement.fileType.toUpperCase())}</td>
      <td>${new Date(statement.uploadedAt).toLocaleString()}</td>
      <td><span class="status ${statement.status === "parsed" ? "posted" : "draft"}">${escapeHtml(statement.status)}</span> ${escapeHtml(statement.note)}</td>
      <td class="num">${statement.rowCount}</td>
      <td><button class="danger" type="button" onclick="deleteBankStatement('${statement.id}')">Delete</button></td>
    </tr>
  `).join("") || `<tr><td class="empty" colspan="7">No bank statements uploaded yet.</td></tr>`;
}

function deleteBankStatement(id) {
  const statement = state.bankStatements.find((item) => item.id === id);
  if (!statement) return;
  const transactions = state.bankTransactions.filter((item) => item.statementId === id);
  const postedTransactions = transactions.filter((item) => item.journalId);
  const message = postedTransactions.length
    ? `Delete ${statement.fileName}? ${postedTransactions.length} posted journal(s) created from this upload will be voided and removed from management accounts.`
    : `Delete ${statement.fileName} and its imported transaction rows?`;
  if (!confirm(message)) return;

  const linkedJournalIds = new Set(postedTransactions.map((item) => item.journalId));
  state.journals.forEach((journalEntry) => {
    if (linkedJournalIds.has(journalEntry.id) && journalEntry.status === "posted") {
      journalEntry.status = "voided";
    }
  });
  state.bankStatements = state.bankStatements.filter((item) => item.id !== id);
  state.bankTransactions = state.bankTransactions.filter((item) => item.statementId !== id);
  addAudit("deleted", "bank statement", `${statement.fileName}; ${transactions.length} row(s) removed; ${linkedJournalIds.size} journal(s) voided.`);
  saveState();
  renderAll();
}

function renderBankTransactions() {
  const rows = state.bankTransactions
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((transaction) => {
      ensureBankSuggestion(transaction);
      const suggestedAccount = state.accounts.find((item) => item.id === transaction.suggestedAccountId);
      const accountOptions = state.accounts
        .filter((item) => item.active && item.id !== transaction.bankAccountId)
        .sort((a, b) => a.code.localeCompare(b.code))
        .map((item) => `<option value="${item.id}" ${item.id === transaction.offsetAccountId ? "selected" : ""}>${escapeHtml(item.code)} ${escapeHtml(item.name)}</option>`)
        .join("");
      const disabled = transaction.status === "posted" ? "disabled" : "";
      const action = transaction.status === "posted"
        ? ""
        : `<button type="button" onclick="approveBankTransaction('${transaction.id}')">Approve & Post</button>`;
      return `
        <tr>
          <td>${transaction.date}</td>
          <td class="description-cell">${escapeHtml(transaction.description)}</td>
          <td class="num">${money(transaction.amount)}</td>
          <td>${escapeHtml(transaction.suggestedCategory || "Needs review")}</td>
          <td>${suggestedAccount ? `${escapeHtml(suggestedAccount.code)} ${escapeHtml(suggestedAccount.name)}` : "No suggestion"}</td>
          <td><select ${disabled} onchange="setBankOffsetAccount('${transaction.id}', this.value)"><option value="">Select account</option>${accountOptions}<option value="__new__">+ Create new account</option></select></td>
          <td><span class="status ${transaction.status}">${transaction.status}</span></td>
          <td>${action}</td>
        </tr>
      `;
    })
    .join("");
  $("#bankTransactionRows").innerHTML = rows || `<tr><td class="empty" colspan="8">Parsed transactions will appear here after a statement with readable transaction rows is uploaded.</td></tr>`;
}

function ensureBankSuggestion(transaction) {
  if (transaction.suggestedCategory && transaction.suggestedAccountId) return;
  const suggestion = suggestBankCoding(transaction);
  const suggestedAccountId = suggestion.accountId === transaction.bankAccountId ? "" : suggestion.accountId;
  transaction.suggestedCategory = suggestion.category;
  transaction.suggestedAccountId = suggestedAccountId;
  transaction.offsetAccountId = transaction.offsetAccountId || suggestedAccountId;
}

function setBankOffsetAccount(id, accountId) {
  const transaction = state.bankTransactions.find((item) => item.id === id);
  if (!transaction) return;
  if (accountId === "__new__") {
    const created = createAccountFromBankTransaction(transaction);
    if (!created) {
      renderBankTransactions();
      return;
    }
    accountId = created.id;
  }
  transaction.offsetAccountId = accountId;
  if (transaction.status === "approved") {
    transaction.status = "review";
    transaction.approvedAt = "";
  }
  saveState();
  renderBankTransactions();
}

function createAccountFromBankTransaction(transaction) {
  const code = prompt("New account code");
  if (!code) return null;
  if (state.accounts.some((item) => item.code === code.trim())) {
    alert("Account code already exists.");
    return null;
  }
  const name = prompt("New account name");
  if (!name) return null;
  const type = prompt(`Account type (${Object.keys(ACCOUNT_TYPES).join(", ")})`, transaction.amount > 0 ? "Income" : "Expense");
  if (!type || !ACCOUNT_TYPES[type]) {
    alert("Invalid account type.");
    return null;
  }
  const defaultCategory = ACCOUNT_TYPES[type][0];
  const category = prompt(`Account category (${ACCOUNT_TYPES[type].join(", ")})`, defaultCategory);
  if (!category || !ACCOUNT_TYPES[type].includes(category)) {
    alert("Invalid account category.");
    return null;
  }
  const saved = {
    id: uid("acct"),
    code: code.trim(),
    name: name.trim(),
    type,
    category,
    parentId: "",
    normalBalance: NORMAL_BALANCE[type],
    openingDebit: 0,
    openingCredit: 0,
    active: true
  };
  state.accounts.push(saved);
  addAudit("created", "account", `${saved.code} ${saved.name} created from bank transaction review.`);
  saveState();
  renderAll();
  return saved;
}

function approveBankTransaction(id) {
  const transaction = state.bankTransactions.find((item) => item.id === id);
  if (!transaction || transaction.status === "posted") return;
  if (!transaction.offsetAccountId) return alert("Select or confirm the account code before approval.");
  if (isDateLocked(transaction.date)) return alert("This accounting period is locked.");
  transaction.status = "approved";
  transaction.approvedAt = new Date().toISOString();
  addAudit("approved", "bank transaction", `${transaction.date} ${transaction.description}`);
  createJournalFromBankTransaction(id);
}

function massApproveBankTransactions() {
  const candidates = state.bankTransactions.filter((item) => item.status !== "posted");
  let posted = 0;
  let missingAccount = 0;
  let locked = 0;
  candidates.forEach((transaction) => {
    if (!transaction.offsetAccountId) {
      missingAccount += 1;
      return;
    }
    if (isDateLocked(transaction.date)) {
      locked += 1;
      return;
    }
    transaction.status = "approved";
    transaction.approvedAt = new Date().toISOString();
    addAudit("approved", "bank transaction", `${transaction.date} ${transaction.description}`);
    if (createJournalFromBankTransaction(transaction.id, { silent: true, refresh: false })) posted += 1;
  });
  saveState();
  renderAll();
  alert(`Mass approval complete. Posted: ${posted}. Skipped without account: ${missingAccount}. Skipped locked period: ${locked}.`);
}

function createJournalFromBankTransaction(id, options = {}) {
  const { silent = false, refresh = true } = options;
  const transaction = state.bankTransactions.find((item) => item.id === id);
  if (!transaction || transaction.status === "posted") return false;
  if (transaction.status !== "approved") {
    if (!silent) alert("Approve the account coding before creating the journal.");
    return false;
  }
  if (!transaction.offsetAccountId) {
    if (!silent) alert("Select the other account before creating the journal.");
    return false;
  }
  if (isDateLocked(transaction.date)) {
    if (!silent) alert("This accounting period is locked.");
    return false;
  }
  const amount = Math.abs(transaction.amount);
  const isDeposit = transaction.amount > 0;
  const lines = isDeposit
    ? [
        line(transaction.bankAccountId, transaction.description, amount, 0),
        line(transaction.offsetAccountId, transaction.description, 0, amount)
      ]
    : [
        line(transaction.offsetAccountId, transaction.description, amount, 0),
        line(transaction.bankAccountId, transaction.description, 0, amount)
      ];
  const saved = journal(transaction.date, nextJournalReference(), `Bank: ${transaction.description}`, "posted", lines);
  state.journals.push(saved);
  transaction.status = "posted";
  transaction.journalId = saved.id;
  addAudit("posted", "bank transaction", `${saved.reference} created from bank upload.`);
  if (refresh) {
    saveState();
    renderAll();
  }
  return true;
}

function postedJournals(upTo, from) {
  return state.journals.filter((item) => {
    if (item.status !== "posted") return false;
    if (upTo && item.date > upTo) return false;
    if (from && item.date < from) return false;
    return true;
  });
}

function ledgerBalances({ from = "", to = "" } = {}) {
  const balances = new Map();
  state.accounts.forEach((accountItem) => {
    balances.set(accountItem.id, {
      account: accountItem,
      debit: from ? 0 : toAmount(accountItem.openingDebit),
      credit: from ? 0 : toAmount(accountItem.openingCredit),
      transactions: []
    });
  });
  postedJournals(to, from).forEach((journalEntry) => {
    journalEntry.lines.forEach((entryLine) => {
      const bucket = balances.get(entryLine.accountId);
      if (!bucket) return;
      bucket.debit += toAmount(entryLine.debit);
      bucket.credit += toAmount(entryLine.credit);
      bucket.transactions.push({ journal: journalEntry, line: entryLine });
    });
  });
  return [...balances.values()].map((bucket) => {
    const normal = bucket.account.normalBalance;
    const net = normal === "debit" ? bucket.debit - bucket.credit : bucket.credit - bucket.debit;
    const side = net >= 0 ? normal : normal === "debit" ? "credit" : "debit";
    return { ...bucket, net, side, displayDebit: side === "debit" ? Math.abs(net) : 0, displayCredit: side === "credit" ? Math.abs(net) : 0 };
  });
}

function profitLoss(from, to) {
  const rows = ledgerBalances({ from, to }).filter((item) => ["Income", "Other Income", "Cost of Sales", "Expense", "Tax"].includes(item.account.type));
  const income = rows.filter((item) => ["Income", "Other Income"].includes(item.account.type)).reduce((sum, item) => sum + item.net, 0);
  const expenses = rows.filter((item) => ["Cost of Sales", "Expense", "Tax"].includes(item.account.type)).reduce((sum, item) => sum + item.net, 0);
  return { rows, income, expenses, netProfit: income - expenses };
}

function renderReports() {
  renderTrialBalance();
  renderProfitLoss();
  renderBalanceSheet();
}

function renderTrialBalance() {
  const asAt = $("#tbAsAt").value || today();
  const showZero = $("#tbShowZero").checked;
  const rows = ledgerBalances({ to: asAt }).filter((item) => showZero || Math.abs(item.net) >= 0.005);
  const debit = rows.reduce((sum, item) => sum + item.displayDebit, 0);
  const credit = rows.reduce((sum, item) => sum + item.displayCredit, 0);
  $("#trialBalanceReport").innerHTML = `
    ${reportHeader("Trial Balance", `As at ${asAt}`)}
    <div class="table-wrap"><table>
      <thead><tr><th>Code</th><th>Account</th><th class="num">Debit</th><th class="num">Credit</th></tr></thead>
      <tbody>
        ${rows.map((item) => `<tr><td>${escapeHtml(item.account.code)}</td><td>${escapeHtml(item.account.name)}</td><td class="num">${item.displayDebit ? money(item.displayDebit) : ""}</td><td class="num">${item.displayCredit ? money(item.displayCredit) : ""}</td></tr>`).join("")}
      </tbody>
      <tfoot><tr class="grand-total"><td colspan="2">Total</td><td class="num">${money(debit)}</td><td class="num">${money(credit)}</td></tr></tfoot>
    </table></div>
  `;
}

function renderProfitLoss() {
  const from = $("#plFrom").value || state.company.fyStart;
  const to = $("#plTo").value || today();
  const report = profitLoss(from, to);
  let grossProfit = sectionTotal(report.rows, (item) => item.account.type === "Income") - sectionTotal(report.rows, (item) => item.account.type === "Cost of Sales");
  $("#profitLossReport").innerHTML = `
    ${reportHeader("Profit & Loss", `${from} to ${to}`)}
    <div class="table-wrap"><table>
      <tbody>
        ${renderReportSection("Revenue", report.rows.filter((item) => item.account.type === "Income"))}
        ${renderReportSection("Cost of Sales", report.rows.filter((item) => item.account.type === "Cost of Sales"))}
        <tr class="subtotal"><td>Gross Profit</td><td class="num">${money(grossProfit)}</td></tr>
        ${renderReportSection("Other Income", report.rows.filter((item) => item.account.type === "Other Income"))}
        ${renderReportSection("Expenses", report.rows.filter((item) => item.account.type === "Expense"))}
        ${renderReportSection("Tax Expense", report.rows.filter((item) => item.account.type === "Tax"))}
        <tr class="grand-total"><td>Net Profit / (Loss)</td><td class="num">${money(report.netProfit)}</td></tr>
      </tbody>
    </table></div>
  `;
}

function renderBalanceSheet() {
  const asAt = $("#bsAsAt").value || today();
  const fyStart = state.company.fyStart;
  const balances = ledgerBalances({ to: asAt });
  const pl = profitLoss(fyStart, asAt);
  const rows = balances.filter((item) => ["Asset", "Liability", "Equity"].includes(item.account.type));
  const assets = sectionTotal(rows, (item) => item.account.type === "Asset");
  const liabilities = sectionTotal(rows, (item) => item.account.type === "Liability");
  const equityAccounts = sectionTotal(rows, (item) => item.account.type === "Equity");
  const equity = equityAccounts + pl.netProfit;
  const difference = assets - (liabilities + equity);
  $("#balanceSheetReport").innerHTML = `
    ${reportHeader("Balance Sheet", `As at ${asAt}`)}
    <div class="table-wrap"><table>
      <tbody>
        ${renderReportSection("Current Assets", rows.filter((item) => item.account.category === "Current Assets"))}
        ${renderReportSection("Non-current Assets", rows.filter((item) => item.account.category === "Non-current Assets"))}
        <tr class="subtotal"><td>Total Assets</td><td class="num">${money(assets)}</td></tr>
        ${renderReportSection("Current Liabilities", rows.filter((item) => item.account.category === "Current Liabilities"))}
        ${renderReportSection("Non-current Liabilities", rows.filter((item) => item.account.category === "Non-current Liabilities"))}
        <tr class="subtotal"><td>Total Liabilities</td><td class="num">${money(liabilities)}</td></tr>
        ${renderReportSection("Equity", rows.filter((item) => item.account.type === "Equity"))}
        <tr><td>Current Year Profit / (Loss)</td><td class="num">${money(pl.netProfit)}</td></tr>
        <tr class="subtotal"><td>Total Equity</td><td class="num">${money(equity)}</td></tr>
        <tr class="grand-total"><td>Total Liabilities and Equity</td><td class="num">${money(liabilities + equity)}</td></tr>
        <tr><td>Balance Check</td><td class="num">${money(difference)}</td></tr>
      </tbody>
    </table></div>
  `;
}

function reportHeader(title, subtitle) {
  return `<div class="report-header"><strong>${escapeHtml(state.company.name)}</strong><span>${title}</span><span>${subtitle}</span><span>${escapeHtml(state.company.currency)}</span></div>`;
}

function renderReportSection(title, rows) {
  const filtered = rows.filter((item) => Math.abs(item.net) >= 0.005);
  const total = filtered.reduce((sum, item) => sum + item.net, 0);
  return `
    <tr class="section-title"><td colspan="2">${escapeHtml(title)}</td></tr>
    ${filtered.map((item) => `<tr><td>${escapeHtml(item.account.code)} ${escapeHtml(item.account.name)}</td><td class="num">${money(item.net)}</td></tr>`).join("") || `<tr><td class="empty" colspan="2">No balances</td></tr>`}
    <tr class="subtotal"><td>Total ${escapeHtml(title)}</td><td class="num">${money(total)}</td></tr>
  `;
}

function sectionTotal(rows, filter) {
  return rows.filter(filter).reduce((sum, item) => sum + item.net, 0);
}

function renderDashboard() {
  const asAt = $("#bsAsAt").value || state.company.fyEnd;
  const pl = profitLoss(state.company.fyStart, asAt);
  const balances = ledgerBalances({ to: asAt });
  const assets = sectionTotal(balances, (item) => item.account.type === "Asset");
  const debit = balances.reduce((sum, item) => sum + item.displayDebit, 0);
  const credit = balances.reduce((sum, item) => sum + item.displayCredit, 0);
  $("#metricProfit").textContent = money(pl.netProfit);
  $("#metricAssets").textContent = money(assets);
  $("#metricTbStatus").textContent = Math.abs(debit - credit) < 0.005 ? "Balanced" : "Out by " + money(debit - credit);
  $("#metricPosted").textContent = state.journals.filter((item) => item.status === "posted").length;
  $("#recentJournalRows").innerHTML = [...state.journals].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6).map((item) => `
    <tr>
      <td>${item.date}</td>
      <td>${escapeHtml(item.reference)}</td>
      <td>${escapeHtml(item.description)}</td>
      <td><span class="status ${item.status}">${item.status}</span></td>
      <td class="num">${money(item.lines.reduce((sum, lineItem) => sum + lineItem.debit, 0))}</td>
    </tr>
  `).join("");
}

function renderInvoiceForms() {
  fillDashboardAccountSelect("#salesInvoiceForm select[name='incomeAccountId']", (item) => ["Income", "Other Income"].includes(item.type));
  fillDashboardAccountSelect("#salesInvoiceForm select[name='receivableAccountId']", (item) => item.type === "Asset");
  fillDashboardAccountSelect("#supplierInvoiceForm select[name='expenseAccountId']", (item) => ["Expense", "Cost of Sales", "Asset", "Tax"].includes(item.type));
  fillDashboardAccountSelect("#supplierInvoiceForm select[name='payableAccountId']", (item) => item.type === "Liability");
  setInvoiceFormDefaults(false);
}

function fillDashboardAccountSelect(selector, filter) {
  const select = $(selector);
  if (!select) return;
  const selected = select.value;
  select.innerHTML = state.accounts
    .filter((item) => item.active && filter(item))
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((item) => `<option value="${item.id}">${escapeHtml(item.code)} ${escapeHtml(item.name)}</option>`)
    .join("");
  if ([...select.options].some((option) => option.value === selected)) select.value = selected;
}

function setInvoiceFormDefaults(force = true) {
  ["#salesInvoiceForm", "#supplierInvoiceForm"].forEach((selector) => {
    const form = $(selector);
    if (!form) return;
    const dateInput = form.elements.date;
    if (dateInput && (force || !dateInput.value)) dateInput.value = today();
  });
}

function generateMonthlyPeriods(start, end) {
  const periods = [];
  let current = new Date(`${start}T00:00:00`);
  const final = new Date(`${end}T00:00:00`);
  while (current <= final) {
    const periodStart = new Date(current);
    const periodEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
    if (periodEnd > final) periodEnd.setTime(final.getTime());
    periods.push({
      id: uid("period"),
      name: `${periodStart.toLocaleString("en", { month: "short" })} ${periodStart.getFullYear()}`,
      start: periodStart.toISOString().slice(0, 10),
      end: periodEnd.toISOString().slice(0, 10),
      locked: false
    });
    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  }
  return periods;
}

function renderPeriods() {
  $("#periodRows").innerHTML = state.periods.map((period) => `
    <tr>
      <td>${escapeHtml(period.name)}</td>
      <td>${period.start}</td>
      <td>${period.end}</td>
      <td><span class="status ${period.locked ? "locked" : "open"}">${period.locked ? "Locked" : "Open"}</span></td>
      <td><button class="secondary" type="button" onclick="togglePeriod('${period.id}')">${period.locked ? "Unlock" : "Lock"}</button></td>
    </tr>
  `).join("") || `<tr><td class="empty" colspan="5">Generate periods from the company financial year.</td></tr>`;
}

function togglePeriod(id) {
  const period = state.periods.find((item) => item.id === id);
  if (!period) return;
  period.locked = !period.locked;
  addAudit(period.locked ? "locked" : "unlocked", "period", `${period.name} ${period.start} to ${period.end}`);
  saveState();
  renderAll();
}

function isDateLocked(date) {
  return state.periods.some((period) => period.locked && date >= period.start && date <= period.end);
}

function renderAudit() {
  $("#auditRows").innerHTML = state.auditLogs.map((item) => `
    <tr>
      <td>${new Date(item.at).toLocaleString()}</td>
      <td>${escapeHtml(item.action)}</td>
      <td>${escapeHtml(item.entity)}</td>
      <td>${escapeHtml(item.details)}</td>
    </tr>
  `).join("") || `<tr><td class="empty" colspan="4">No audit activity yet.</td></tr>`;
}

function exportReport(type) {
  const rows = [];
  if (type === "trial-balance") {
    rows.push(["Code", "Account", "Debit", "Credit"]);
    ledgerBalances({ to: $("#tbAsAt").value }).forEach((item) => rows.push([item.account.code, item.account.name, item.displayDebit || "", item.displayCredit || ""]));
  }
  if (type === "profit-loss") {
    rows.push(["Section", "Account", "Amount"]);
    profitLoss($("#plFrom").value, $("#plTo").value).rows.forEach((item) => rows.push([item.account.category, `${item.account.code} ${item.account.name}`, item.net]));
  }
  if (type === "balance-sheet") {
    rows.push(["Section", "Account", "Amount"]);
    ledgerBalances({ to: $("#bsAsAt").value }).filter((item) => ["Asset", "Liability", "Equity"].includes(item.account.type)).forEach((item) => rows.push([item.account.category, `${item.account.code} ${item.account.name}`, item.net]));
    rows.push(["Equity", "Current Year Profit / (Loss)", profitLoss(state.company.fyStart, $("#bsAsAt").value).netProfit]);
  }
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${type}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

window.editAccount = editAccount;
window.voidJournal = voidJournal;
window.togglePeriod = togglePeriod;
window.setBankOffsetAccount = setBankOffsetAccount;
window.approveBankTransaction = approveBankTransaction;
window.deleteBankStatement = deleteBankStatement;
window.createJournalFromBankTransaction = createJournalFromBankTransaction;

init();
