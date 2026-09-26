# Phase 4: Client Portal & Delivery Guardrails Migration Plan

## 1. Client Credentials Vault
**Encryption Approach (FOR YOUR REVIEW):**
I propose **Application-Level Encryption** using Node's native `crypto` module (`AES-256-GCM`) within Next.js Server Actions. 
- **Encryption**: When adding a credential, a Server Action encrypts the password using a master key stored in `.env.local` (`CREDENTIALS_ENCRYPTION_KEY`). The database only stores the ciphertext, initialization vector (IV), and auth tag. Supabase never sees the plaintext.
- **Decryption & Logging**: To view a password, the client calls a strict Server Action (`revealCredential`). This action enforces RLS (Admin/Manager only), **inserts a row into `credential_access_logs`**, decrypts the password, and returns it to the client. The UI will hide it again after a timeout.
- *Why not database-level (pgsodium)?* Doing it in Server Actions forces the decryption and the access logging to happen in the exact same transactional flow, ensuring the log can never be bypassed.

**Schema Updates:**
- Create `client_credentials` (`id`, `company_id`, `service_name`, `url`, `username`, `encrypted_password`, `iv`, `auth_tag`).
- Create `credential_access_logs` (`id`, `credential_id`, `user_id`, `accessed_at`).

## 2. Revision Rounds
**Schema Updates:**
- Add `contract_revision_limit INT DEFAULT 3` to the `projects` table.
- Add `revision_count INT DEFAULT 0` to the `milestones` table.

**UI & Logic Implementation:**
- Whenever a client submits "Request changes" on a milestone, increment `revision_count`.
- If `revision_count > contract_revision_limit`, any new tasks spawned for this milestone are automatically flagged with `is_out_of_scope = true`.
- Update the Project Detail page to display a "Chargeable Extras" section surfacing these out-of-scope tasks.
- Add a one-click "Add to invoice as line item" button (which creates a line item on the associated invoice).

## 3. Client Feedback in the Portal
**UI Implementation:**
- On the client portal milestone view, add a "Request Changes" button alongside the "Approve" button.
- Clicking it opens a modal requiring a text comment.
- **Server Action:** Submitting this comment increments the milestone revision counter, creates a new `task` in the CRM linked to the milestone, and inserts a `notification` (via the system built in Phase 2) for the team.

## 4. Portal Access and Payments
**Access & Security Updates:**
- Migrate clients to Supabase Auth OTP (Magic Links) using `supabase.auth.signInWithOtp({ email })`.
- During the transition, the middleware will check for the old unguessable-UUID in the URL. If present, it bypasses auth (legacy access). If absent, it forces the Magic Link flow.
- The milestone `/approve` endpoint will be secured by verifying the active Supabase session (or legacy UUID) rather than relying solely on the URL.

**Payments:**
- Per your instruction, the dead bKash and Stripe buttons will be **removed** from the portal entirely to eliminate friction and confusion.

## 5. ROI Fields Admin UI
**UI Implementation:**
- The fields `total_ad_spend`, `leads_generated`, and `est_roi_value` already exist in the database and portal, but lack a CRM interface.
- Add these fields to the Project Edit modal/form in the CRM.
- Add validation to ensure they are formatted nicely (tabular-nums). 

---

# Migration SQL Script

```sql
-- 1. CREDENTIALS VAULT
CREATE TABLE IF NOT EXISTS client_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    service_name TEXT NOT NULL,
    url TEXT,
    username TEXT,
    encrypted_password TEXT NOT NULL,
    iv TEXT NOT NULL,
    auth_tag TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);
ALTER TABLE client_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "AdminManager_All_Credentials" ON client_credentials FOR ALL USING (get_user_role() IN ('admin', 'manager'));

CREATE TABLE IF NOT EXISTS credential_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credential_id UUID REFERENCES client_credentials(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    accessed_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE credential_access_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "AdminManager_Read_Logs" ON credential_access_logs FOR SELECT USING (get_user_role() IN ('admin', 'manager'));

-- 2. REVISION ROUNDS
ALTER TABLE projects ADD COLUMN IF NOT EXISTS contract_revision_limit INT DEFAULT 3;
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS revision_count INT DEFAULT 0;
```
