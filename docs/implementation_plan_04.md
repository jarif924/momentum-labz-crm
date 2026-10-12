# CRM Enhancement Plan: Premium UI, Google-Sheet Leads, and Brainstorming Hub

We will implement all three of your requests to make the CRM significantly more tailored and powerful.

## 1. Proposals UI Customization (Premium UI)
**Goal:** Make the "Add Proposal" modal and Proposals section look highly premium and give you more customizable fields.
- **Action:** Refactor the `Add Proposal` modal to use a polished, multi-step or wide two-column layout. 
- **Action:** Add rich inputs, better typography, and custom styling for Services selection.
- **Action:** Enhance the Proposals table/grid view to look like a world-class financial dashboard.

## 2. Google-Sheet Style Leads View
**Goal:** Restructure the leads list to match your exact CSV format and look like a dense, highly scannable Google Sheet rather than a simple list.
- **Action:** Overhaul `LeadsList.tsx` into a proper data-table/spreadsheet grid.
- **Columns to Implement (matching your CSV):**
  - Company Name
  - Service
  - Running Meta Ads (Checkbox/Tag)
  - Niche / Industry
  - Demo Status
  - Link (Website/Demo Link)
  - Status (Pipeline Stage)
  - Contact Info (Email/Phone)
  - Follow-up Date
- **Action:** Add the missing fields (Running Meta ads, Niche, Demo Status) to the database schema (`leads` table or `companies` table) so you can actually save this data.

## 3. Collaborative Brainstorming / Planning Section
**Goal:** A dedicated place for you and your teammates to brainstorm, drop notes, plan features, and save ideas.
- **Action:** Create a new root section called **"Brainstorming"** (accessible from the sidebar).
- **Action:** Build a Notion-style interface or a "Sticky Notes / Planning Board" where team members can create notes, link ideas, and store plans safely.
- **Action:** Deploy backend agents to wire up a new database table `brainstorm_notes` to handle saving and loading these notes automatically.

### User Review Required
Before I deploy my sub-agents to start writing the code, please confirm:
1. **Database Additions:** Is it okay if I add `niche`, `demo_status`, and `running_meta_ads` as new columns to your database so the Leads spreadsheet works perfectly?
2. **Brainstorming Style:** Would you prefer the Brainstorming section to look like a **Notion Document/Wiki**, or a **Sticky Notes / Freeform Board**?

Let me know your preference and I will deploy the agents to execute immediately!
