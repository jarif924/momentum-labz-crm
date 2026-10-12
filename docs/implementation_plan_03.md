# Phase 6: Client Portal & Projects Hub

This phase introduces a white-labeled client portal where clients can view their project milestones and approve designs. To manage this internally, we are also building the Projects UI in the CRM.

## Proposed Changes

### 1. CRM Projects Management
The CRM needs a place for the agency owner to manage project delivery and share the magic link.
- **[MODIFY]** `src/components/shell/Sidebar.tsx`
  - Add `Projects` to the `Sales` navigation group.
- **[NEW]** `src/app/(app)/projects/page.tsx`
  - A dashboard listing all projects (auto-created when leads are marked "Won").
  - Displays project status (`planning`, `active`, `completed`), target dates, and linked company/contact.
- **[NEW]** `src/app/(app)/projects/[id]/page.tsx`
  - Internal project detail page.
  - A prominent "Copy Client Portal Link" button that copies `https://momentum-labz-crm.vercel.app/portal/[project_id]`.
  - A task list (milestones) specifically for this project where the agency can toggle `is_client_visible` and `requires_client_approval`.

### 2. The Client Portal (White-labeled)
A secure, unauthenticated route for clients. Data is fetched securely on the server using `pg` to safely bypass RLS (since it's a read-only public URL by unguessable UUID).
- **[NEW]** `src/app/portal/[id]/page.tsx` (Server Component)
  - Fetches the project, visible tasks (`is_client_visible = true`), and linked invoices via `pg` client.
  - Sleek, read-only UI tailored for the client. Includes branding, project URLs (Staging/Figma), and a timeline of milestones.
- **[NEW]** `src/components/portal/PortalTaskApproveButton.tsx` (Client Component)
  - For tasks requiring client approval, this button lets the client mark a milestone as "Approved".
- **[NEW]** `src/app/api/portal/[project_id]/approve/[task_id]/route.ts`
  - Secure server action endpoint that updates the task to `completed` in the database.

## Verification Plan
1. Mark a Lead as "Won" to auto-generate a Project (or use existing projects in DB).
2. Navigate to the new `/projects` page in the CRM.
3. Open a Project and copy the Magic Link.
4. Open the Magic Link in an Incognito window and verify the Client Portal renders beautifully without login.
5. Click "Approve Design" on a milestone and verify the internal CRM reflects the task as completed.
