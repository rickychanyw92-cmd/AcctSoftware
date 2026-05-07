# Accounting Agent Blueprint

This document defines the first agent structure for the accounting application.

The design uses one main coordinating agent and three specialist sub-agents:

1. Main Accounting Manager Agent
2. Document Extraction Agent
3. Account Classification Agent
4. Review & Reporting Agent

No agent should post transactions into the ledger without accountant approval.

## Main Accounting Manager Agent

### Purpose

Coordinate the full accounting workflow from document upload to management accounts.

### Responsibilities

- Receive uploaded bank statements, spreadsheets, PDFs, journals, and supporting documents.
- Decide which sub-agent should process each item.
- Maintain the status of each workflow item.
- Consolidate outputs from the sub-agents.
- Identify incomplete, duplicated, or low-confidence transactions.
- Route transactions to accountant review.
- Publish approved transactions into the accounting ledger.
- Trigger management account generation after approval.

### Inputs

- Uploaded file metadata
- Extracted transaction rows
- Suggested account classifications
- Accountant approval decisions
- Company settings
- Chart of accounts
- Accounting period locks

### Outputs

```json
{
  "workflow_id": "WF-0001",
  "source_file_id": "FILE-0001",
  "status": "pending_review",
  "assigned_agent": "review_reporting_agent",
  "summary": {
    "transactions_extracted": 92,
    "transactions_classified": 92,
    "transactions_requiring_review": 12,
    "blocking_issues": []
  }
}
```

### Posting Rule

The Main Accounting Manager Agent may only publish transactions when:

- the transaction has a selected account code;
- the transaction has accountant approval;
- the accounting period is not locked;
- debit and credit entries are balanced;
- the transaction has not already been posted.

## Document Extraction Agent

### Purpose

Extract structured accounting data from uploaded documents.

### Responsibilities

- Read CSV, Excel, and text-based PDF bank statements.
- Extract transaction date, description, debit amount, credit amount, net amount, reference, and balance where available.
- Preserve all available description columns from Excel/CSV files.
- Identify source document, page, sheet, row, and extraction confidence.
- Flag unreadable files, scanned PDFs, missing headers, or ambiguous rows.

### Inputs

- File name
- File type
- Raw extracted text or table data
- Bank name
- Ledger bank account

### Outputs

```json
{
  "source_file_id": "FILE-0001",
  "file_type": "xlsx",
  "bank_name": "DBS Bank",
  "transactions": [
    {
      "source_row": 12,
      "date": "2026-03-30",
      "description": "PAYNOW TRANSFER | CUSTOMER ABC | INV-1024",
      "debit": 0,
      "credit": 1629.79,
      "amount": 1629.79,
      "reference": "INV-1024",
      "balance": 18820.55,
      "confidence": 0.94,
      "issues": []
    }
  ],
  "issues": []
}
```

### Extraction Rules

- If debit and credit columns exist, calculate `amount = credit - debit`.
- If only amount exists, preserve its sign.
- Combine all description-like fields into one detailed description.
- Do not invent descriptions. Use `"Bank transaction"` only when no usable text exists.
- For scanned PDFs, return an issue requiring OCR.

## Account Classification Agent

### Purpose

Suggest the closest account category and account code for each extracted transaction.

### Responsibilities

- Read transaction description, amount direction, bank, and available reference details.
- Suggest whether the item belongs to Profit & Loss or Balance Sheet.
- Suggest the closest account code from the chart of accounts.
- Provide confidence and reasoning.
- Flag transactions that require accountant review.

### Inputs

- Extracted transaction rows
- Chart of accounts
- Historical classification rules
- Bank transaction direction

### Outputs

```json
{
  "transaction_id": "BANK-0001",
  "description": "DBS BANK CHARGE",
  "amount": -18,
  "suggested_report_type": "profit_and_loss",
  "suggested_category": "Expense",
  "suggested_account_code": "6100",
  "suggested_account_name": "Bank Charges",
  "confidence": 0.92,
  "reason": "Description contains bank charge keyword and transaction is money out.",
  "requires_review": false
}
```

### Classification Rules

- Money out usually maps to expense, asset purchase, liability repayment, or owner withdrawal.
- Money in usually maps to revenue, receivable collection, loan, capital injection, or refund.
- Never classify solely by amount.
- If confidence is below 0.8, mark `requires_review = true`.
- If the suggested account is the same as the ledger bank account, leave it blank for accountant review.

## Review & Reporting Agent

### Purpose

Prepare transactions for accountant review and generate management accounts after approval.

### Responsibilities

- Display extracted transactions with suggested account codes.
- Highlight missing account codes, duplicates, locked periods, and low-confidence classifications.
- Support one-by-one approval.
- Support mass approve and post.
- Create balanced journal entries from approved transactions.
- Generate Trial Balance, Profit & Loss, and Balance Sheet.

### Inputs

- Classified transactions
- Accountant edits and approvals
- Journal entries
- Chart of accounts
- Reporting dates

### Outputs

```json
{
  "review_batch_id": "REV-0001",
  "status": "ready_for_approval",
  "summary": {
    "total_transactions": 92,
    "ready_to_post": 80,
    "missing_account_code": 5,
    "possible_duplicates": 3,
    "locked_period": 4
  },
  "posting_preview": {
    "total_debit": 125000.5,
    "total_credit": 125000.5,
    "balanced": true
  }
}
```

### Approval Rules

- Unapproved transactions must not appear in management accounts.
- Posted transactions must create balanced debit and credit lines.
- Deleted statement uploads should remove imported rows.
- If posted rows are deleted later, linked journals should be voided instead of erased.
- Locked accounting periods should block posting.

## End-To-End Workflow

```text
User uploads statement
        |
        v
Main Accounting Manager Agent
        |
        v
Document Extraction Agent
        |
        v
Account Classification Agent
        |
        v
Review & Reporting Agent
        |
        v
Accountant review and approval
        |
        v
Main Accounting Manager Agent posts journals
        |
        v
Management accounts generated
```

## Transaction Statuses

| Status | Meaning |
|---|---|
| uploaded | Source file has been uploaded |
| parsed | Transactions were extracted |
| review | Transaction is awaiting accountant review |
| approved | Accountant approved the account code |
| posted | Journal was posted to the ledger |
| voided | Posted journal was reversed or excluded |
| error | Transaction cannot proceed without fixing issues |

## Minimum Implementation Order

1. Store uploaded file metadata.
2. Extract transaction rows.
3. Preserve full bank descriptions.
4. Suggest account category and account code.
5. Show accountant review table.
6. Allow manual account code override.
7. Approve and post one transaction.
8. Mass approve and post reviewed transactions.
9. Generate Trial Balance.
10. Generate Profit & Loss.
11. Generate Balance Sheet.

## Future Improvements

- OCR for scanned PDF bank statements.
- Historical learning from accountant corrections.
- Duplicate transaction detection.
- Bank-specific parsers for DBS, OCBC, UOB, HSBC, Standard Chartered, and Maybank.
- Confidence-based review queue.
- Full audit trail by user.
- Role-based approval permissions.
