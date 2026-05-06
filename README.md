# LedgerLite Accounting MVP

A self-contained browser accounting app for a small-company reporting workflow.

## Features

- Company profile and financial year setup
- Chart of accounts with account type, category, normal balance, opening balances, and active status
- Double-entry journal entry form with draft, post, and void status
- Bank statement upload workflow for CSV, Excel, and PDF files
- Singapore bank dropdown for identifying uploaded statements
- CSV, Excel, and text-based PDF bank statement parsing with suggested account categories and account codes
- Accountant approval before imported bank transactions become journals
- Delete uploaded bank statements and remove their imported rows
- Mass approve and post reviewed bank transactions
- Period locking for monthly accounting periods
- Audit trail for key actions
- Trial Balance report
- Profit & Loss report
- Balance Sheet report
- CSV export for all three reports
- Local browser persistence using `localStorage`
- Sample data included on first load

## Run

Open `index.html` in a browser.

No package install or build step is required.

## Accounting Rules Implemented

- Posted journals must balance before they affect reports.
- Draft and voided journals are excluded from report calculations.
- Locked periods block new posted journals.
- Trial Balance includes opening balances and posted journals up to the selected as-at date.
- Profit & Loss includes income and expense activity inside the selected date range.
- Balance Sheet includes assets, liabilities, equity, and current-year profit or loss as at the selected date.

## Bank Statement Uploads

CSV, TXT, TSV, Excel, and text-based PDF statements are parsed in the browser. CSV and Excel files work best when they include columns such as `date`, `description`, `amount`, `debit`, `credit`, `withdrawal`, and `deposit`. PDF extraction works for selectable-text PDFs; scanned image PDFs need OCR in a production build.

Uploads require selecting the Singapore bank that issued the statement and the ledger bank account that should be debited or credited when approved transactions are posted.

Each imported transaction appears in the Bank Transactions table with a suggested account category and account code based on its description and money-in/money-out direction. The accountant can change the account code, then use `Approve & Post` to create the posted journal. Only approved bank transactions flow into the ledger and management accounts.

For Excel and CSV uploads, the transaction description combines all available narrative fields such as description, transaction details, remarks, particulars, reference, payee, and payer. If a bank file uses unnamed detail columns, the parser also includes non-date and non-amount text cells so the accountant has enough detail to reclassify the suggested account code manually.

Incorrect uploads can be deleted from the Uploaded Statements table. Deleting a statement removes its imported rows; if any rows were already posted, the linked journals are voided so they stop affecting the management accounts.

The static app loads SheetJS and PDF.js from a CDN for Excel/PDF parsing. A production build should bundle those dependencies or move parsing server-side for reliability and security.
