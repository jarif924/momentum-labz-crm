# Finance & Invoices Audit Report
**Auditor:** AUDITOR 2: FINANCE & INVOICES
**Test Data Prefix:** `QA-FIN-`

---

## Checklist Findings

### Invoice CRUD
- [x] **PASS**: Create invoice with 3 line items
- [x] **PASS**: Line items: description, qty, unit_price all save correctly
- [x] **PASS**: Edit invoice: all fields update
- [x] **FAIL**: Delete invoice: invoice number not reused
  * **Issue**: `nextInvoiceNumber()` calculates the next number dynamically by finding the highest existing invoice number. If the highest invoice is deleted, its number will be immediately reused for the next new invoice.
- [x] **PASS**: Status transitions: draft → sent → paid, draft → overdue, draft → cancelled (Manual selection works).
- [x] **FAIL**: Can a PAID invoice be edited? Log actual behavior
  * **Issue**: Yes. The system freely allows editing an invoice with a "paid" status. Users can change the amount, line items, and discount even after it's marked paid, which compromises accounting integrity.

### Calculations
- [x] **PASS**: Line total = qty × unit_price
- [x] **PASS**: Subtotal = sum of all line totals
- [x] **PASS**: Tax = subtotal × (tax_rate/100)
- [x] **FAIL**: Discount subtracted before or after tax? Check the code logic and document it
  * **Issue**: The discount is subtracted **AFTER** the tax is calculated. Formula used: `subtotal + (subtotal * tax) - discount`. This means tax is applied to the original, un-discounted amount.
- [x] **FAIL**: Test: 3 lines with odd amounts + 15% VAT + 10% discount.
  * **Issue**: The system does not support percentage-based discounts in the UI — it only accepts a flat `discount_amount`. For a subtotal of 5500, a 15% tax yields 825. A flat discount of 1000 results in a total of 5325, instead of applying the discount before tax calculation.
- [x] **PASS**: Rounding: consistent between list view, modal, print view.

### Currency
- [x] **FAIL**: BDT invoice: ৳ symbol correct, lakh format (e.g. ৳4,50,000 not ৳450,000)
  * **Issue**: The code uses `.toLocaleString('en-BD')` for BDT and `en-US` in the print view. In JavaScript, `en-BD` places commas every three digits (e.g., `450,000`). It needs to use `en-IN` or `bn-BD` to get the correct Indian numbering system (Lakh/Crore format like `4,50,000`).
- [x] **PASS**: USD invoice: $ symbol correct
- [x] **PASS**: AUD invoice: A$ or AU$ symbol shown (A$ is shown).
- [x] **FAIL**: Changing currency after adding lines — check if amounts reset or keep values
  * **Issue**: When switching currencies, the line item numbers simply persist. For example, 500 BDT becomes 500 USD blindly without any conversion or resetting.

### Invoice Numbering
- [x] **PASS**: Sequential and unique (DB enforced unique constraint).
- [x] **FAIL**: Deletions don't cause number reuse
  * **Issue**: As detailed in CRUD, deleting the highest invoice causes its number to be reused on the next creation.
- [x] **FAIL**: Create 2 invoices rapidly — check for duplicate numbers
  * **Issue**: Because the next number is generated on the client side using existing DB records, rapid creation in two tabs creates a race condition. The DB `UNIQUE` constraint correctly blocks the second insert, but the user is met with a generic "Invoice number already exists" UI error rather than the system auto-retrying with a fresh number.

### Print View (/print/invoices/[id])
- [x] **PASS**: Open print view for a BDT invoice — check: ৳ renders (not a box), line items shown, tax shown, discount shown, total correct.
- [x] **PASS**: Open print view for a USD invoice with discount.
- [x] **PASS**: Page title, invoice number, client name all correct.
- [x] **PASS**: Agency details shown.
- [x] **PASS**: Client address shown.
- [x] **PASS**: Due date shown.
- [x] **PASS**: Payment instructions shown.

### Finance Overview (/finances)
- [x] **FAIL**: Outstanding amount shows correctly per currency (never summed across currencies)
  * **Issue**: In `/finances`, it calculates outstanding amounts grouped by currency internally, but the UI **hardcodes to only display BDT outstanding/overdue stats**. USD and AUD outstanding amounts are completely hidden from the key metrics row. Furthermore, in `/invoices`, the `Total Outstanding` completely ignores currency and sums BDT, USD, and AUD numbers together directly (e.g., 100 USD + 100 BDT = 200 BDT).
- [x] **FAIL**: Overdue amount shows correctly
  * **Issue**: Same issue as above, only BDT overdue amounts are shown on `/finances`.
- [x] **FAIL**: Totals reconcile with the invoice list
  * **Issue**: Totals in the invoice list dangerously sum across different currencies. 100 USD + 100 BDT incorrectly outputs `৳200`.

### Expenses
- [x] **PASS**: Create expense with category, amount, date
- [x] **PASS**: Edit and delete work
- [x] **FAIL**: Shown in Finance overview correctly
  * **Issue**: Expenses of all currencies are blindly summed together as `totalExpenses`. A $100 USD software expense and a ৳500 BDT tool expense sum up to ৳600 in the Finance overview.

### EDGE CASES
- [x] **PASS**: Zero quantity line item — does it save? Does it show in total?
  * **Behavior**: Yes, it saves and computes correctly as 0 in the total.
- [x] **PASS**: Negative line item value — what happens?
  * **Behavior**: It subtracts from the subtotal. However, the final invoice total is safely clamped with `Math.max(0, ...)` so it doesn't result in a negative total invoice amount.
- [x] **PASS**: Discount larger than subtotal — total becomes negative?
  * **Behavior**: `Math.max(0, ...)` correctly prevents the total from falling below zero.
- [x] **FAIL**: BDT amount of ৳1,00,00,000 (one crore) — does it format correctly?
  * **Behavior**: Formats incorrectly as `৳10,000,000` due to `en-BD` locale defaulting to thousands instead of lakhs.
- [x] **PASS**: USD $0.01 line item — saves and calculates successfully.
- [x] **FAIL**: Due date: invoice marked overdue only after date passes in Dhaka time (UTC+6)
  * **Behavior**: The invoice is never marked "overdue" automatically based on the date. The "overdue" status is entirely manual and must be selected from the status dropdown by the user. There is no automated job or cron to handle this.
