# Google Stitch Prompt — FreeGency Client (remaining) + Developer Dashboard

Copy everything below the line into Google Stitch. Attach the existing Client Home screenshots (Inspiration + My Projects) and the style-guide frame as visual references.

---

## PROMPT (copy from here)

Design the **remaining Client app screens** and a **complete Developer dashboard** for **freegency**, a software-development freelance marketplace (.NET + Angular). Match the visual language of the attached Client Home mockups and the “Professional Neo-Brutalist Light / Collaborative Warmth” style guide — do **not** invent a new brand look.

### Brand & design system (LOCK)

- Product name: **freegency** (logo wordmark, violet, left of top nav).
- Colors:
  - Primary violet: `#5B4FF0` / `#4130d7`
  - Secondary lime: `#D6FF3F` / `#c7ef2e`
  - Tertiary coral: `#FF5C7A` / `#c32e50`
  - Neutrals: near-black `#121214` / `#1b1b1d` text; soft surfaces `#fcf8fb`, white cards
- Typography:
  - Display / headings: **Plus Jakarta Sans**
  - Body: **Inter**
  - Labels / data / mono chips: **JetBrains Mono**
- UI rules:
  - Large rounded corners (12–24px), generous whitespace, soft violet-tinted shadows
  - Pill CTAs, chip filters, clean cards — professional, not playful clutter
  - **No left sidebar** — top header chrome only (same pattern as attached Client Home)
  - Light mode only for these screens
  - Icons: simple flat / stroke icons (Hugeicons-like)
- Desktop-first layouts (1440px), then clean responsive stacking for tablet/mobile

### Product context (important for UX)

- Roles: Client posts projects; Developer (freelancer) applies solo or joins teams; Teams apply as agencies.
- **AI in product (must appear in UI):**
  1. **Create Project assist** — AI helps draft title, description, skills, budget.
  2. **Proposal summarize** — under each proposal card, a Gemini-on-YouTube style hint: **exactly 3 short bullets** summarizing the proposal.
  3. **RAG matching** — recommend best freelancers/teams for a project, and best jobs for a developer based on portfolio + interests/specialties/skills.
  4. **Moderation** — outbound chat + reviews are gated; blocked content is not shown (subtle “blocked by safety” state if needed).
- **Project Invite → Direct chat (justifies 1:1 messaging):**
  - Client invites a freelancer or team to a published project.
  - On accept → open a **Direct** chat (Client ↔ Developer or Team Leader).
  - No cold DMs. Chat is for discussing the job and asking them to submit a proposal.
- **Tasks = Trello:** Do **not** design a full in-app Kanban competitor. In Manage Work / Active Project show **“Tasks powered by Trello”** with Open Board / embed placeholder and optional lightweight task list linking to Trello cards.
- **Developer taxonomy onboarding:** Interests (categories) → Specialties under each interest → Skills under each specialty → then portfolio starter.

---

## A) CLIENT — remaining views

Assume these already exist (match them; do not redesign from scratch):
- Client Home · Inspiration tab
- Client Home · My Projects tab
- Client top header: Hire Talent · Manage Work · Reports · Messages · search · notifications · avatar

Design the following Client screens in the **same chrome**:

### A1. Create Project — Manual
- Multi-section form: title, description, category, specialty, skills chips, budget (fixed), deadline, visibility.
- Primary CTA: Save Draft / Publish.
- Secondary: “Use AI Assist” toggle or link to A2.

### A2. Create Project — AI Assist
- Left/main: conversational brief input (“Describe what you need…”).
- Right/side panel: AI-generated draft fields (title, description, suggested skills, budget) with Accept / Edit / Regenerate.
- Same header chrome; violet primary actions; lime accent for AI wand / sparkle cues (subtle, not neon overload).

### A3. Project Detail (Client)
- Header: status chip (Draft / Open / In progress / Completed), title, budget, timeline.
- Tabs or sections: Overview · Proposals · Milestones · Team/Members · Files · Tasks (Trello) · Activity.
- **Proposals list:** each proposal card shows applicant (user or team), budget, cover letter preview, Accept/Reject.
  - **Under each card:** AI hint strip with **3 bullet points** summarizing the proposal (labeled “AI summary” in JetBrains Mono / small caption).
- Matching CTA: “Find talent for this project” → A4.

### A4. Hire Talent / Best Matches
- Project selector (which of my published projects).
- Section: **Best matching freelancers** (avatar, title, skills, match %).
- Section: **Best matching teams** (logo, name, specialties, match %).
- Each card: **Invite to project** primary button + View profile.
- Empty/loading/AI-thinking states.

### A5. Invite modal + Invite status
- Modal: select project, short message, confirm Invite.
- Toast / status: Pending · Accepted · Rejected.
- After Accepted: CTA **Open chat**.

### A6. Messages
- Two-pane: conversation list + thread.
- Room type badges: Direct · Proposal · Project · Team.
- Direct threads show related project context chip (“Re: E-commerce RN Engineer”).
- Composer with note that messages are safety-checked (subtle).

### A7. Manage Work
- List/active engagement cards with milestone progress.
- Detail: milestones timeline + escrow summary (Available / Locked / Released — simple, not finance-heavy).
- **Tasks powered by Trello:** branded card with Trello logo mark, “Open board”, optional iframe/embed placeholder, last synced label.
- Upcoming deadlines list (reuse style from My Projects sidebar widgets).

### A8. Reports (light MVP)
- Simple stats: Total / In Progress / Draft / Completed, spend overview, success score bars — same navy info cards as Home sidebar.

### A9. Notifications
- Inbox list: invite accepted, new proposal, milestone submitted, etc.
- Mark read / clear.

### A10. Client Profile / Settings
- Edit profile, interests, notification prefs, wallet summary entry.

**Also add on Client Home (Inspiration / My Projects):** a horizontal **“Recommended for your projects”** section (freelancers + teams from AI) with Invite CTAs — consistent with A4 cards.

---

## B) DEVELOPER — full dashboard

Create a parallel app shell with the **same visual system**, but developer nav:

**Developer header:** Find Work · My Work · Teams · Messages · Earnings · search · bell · avatar  
Greeting tone similar to Client (“Welcome back, {Name}”).

### B1. Developer Onboarding (multi-step)
1. Profile basics  
2. **Interests** — multi-select category chips  
3. **Specialties** — for each selected interest, specialty chips  
4. **Skills** — for each specialty, skill chips  
5. Portfolio starter (add 1 project optional)  
6. Done → Dashboard  

Progress bar like existing client onboarding (Profile → Interests → Skills → Portfolio).

### B2. Developer Home
- Search + filters for open projects.
- Feed of job/project cards (title, category, budget, timeline, match %).
- Section: **Best matching projects for you** (RAG based on portfolio + taxonomy).
- Sidebar widgets: profile completeness, invite inbox count, earnings snapshot.

### B3. Project / Job Detail (Developer)
- Full brief, skills, budget, client snippet.
- CTAs: **Apply (proposal)** · If invited: **Accept invite** / **Decline**.
- After accept invite: **Open chat with client**.

### B4. Submit Proposal
- Cover letter, proposed budget, attachments, similar work URL.
- Success state → My Proposals.

### B5. My Proposals
- Tabs: Pending / Accepted / Rejected.
- Cards with status chips and link to chat if exists.

### B6. My Work (Active contracts)
- Active projects, milestone status, deliverable upload entry.
- **Trello** card: Open team/project board (Tasks powered by Trello).

### B7. Invites Inbox
- List of project invites from clients; Accept / Reject; on Accept navigate to Direct chat.

### B8. Teams
- My teams list, create/join by code, openings (team jobs), members roster (leader actions).
- Taxonomy chips: categories / specialties / skills.

### B9. Messages
- Same two-pane pattern as Client; Direct threads from invites; Proposal/Project rooms.

### B10. Earnings / Wallet (MVP)
- Available / Pending balances, ledger list, mock top-up not required for developer (receive releases).
- Clean navy/violet cards, JetBrains Mono for amounts.

### B11. Portfolio Manager
- Grid of portfolio projects, add/edit, images, skills tags — public preview.

### B12. Developer Profile / Settings
- Bio, rates display optional, social links, taxonomy edit (same Interests → Specialties → Skills flow).

---

## C) Shared / micro UI to include

- Invite toast + empty states for matching and messages.
- AI badge / wand for assist & summary strips (lime or soft violet, restrained).
- Status chips: Draft, Open, In progress, Completed, Pending, Accepted, Rejected.
- Match % pill on talent and job cards.
- Mobile: collapse header links into menu; keep primary CTAs thumb-friendly.

### Explicitly DO NOT

- Do not design cold “message anyone” UX.
- Do not invent a full Trello clone Kanban as the main tasks UI.
- Do not switch to dark mode as default.
- Do not use purple-glow glassmorphism overload or random emoji spam.
- Do not change the freegency wordmark style from the references.

### Deliverable structure for Stitch

Generate separate high-fidelity frames for each screen listed in A1–A10 and B1–B12, plus components: proposal card with AI 3-bullet hint, talent match card with Invite, Trello tasks panel, Direct chat thread with project context chip.

End of prompt.
