# EvalDesk Insights

BUILD: EvalDesk - Judgment & Scoring Platform Prototype

## BRAND COLORS (From PLP Logo)

- Primary Teal: #00A69E (D shape)

- Primary Magenta: #C41E69 (P shape & text)

- Neutral: #000000 (black accents)

- Backgrounds: #FFFFFF (white), #F8F8F8 (light gray for sections)

- Text: #1A1A1A (dark gray/charcoal)

STRICT REQUIREMENTS:

- NO gradients

- NO emojis

- Icons only (use simple, clean line icons)

- Flat design, professional

- Responsive (mobile & desktop)

---

## PAGE 1: ADMIN DASHBOARD

### Header Section

- Logo placeholder (PLP colors)

- Navigation: Dashboard | Events | Submissions | Judges | Analytics | Settings

- User profile dropdown (top right)

### Main Content Area

**Section 1: Event Overview Card**

- Event title: "TechHack 2026"

- 4 metrics in a row:

  - Submissions: 24/30 (progress bar in teal)

  - Judges Active: 8/10 (progress bar in magenta)

  - Scoring Progress: 45% (progress bar in teal)

  - Days Left: 3 (text warning if < 5 days)

- Quick action buttons (outlined, teal border): "New Event" | "Import Submissions" | "View Rounds"

**Section 2: Submission Status Breakdown**

- 4 status cards in a 2x2 grid:

  - Card 1: "Submitted" - 24 (icon: checkmark, teal text)

  - Card 2: "Under Review" - 8 (icon: eye, magenta text)

  - Card 3: "Scored" - 12 (icon: star, teal text)

  - Card 4: "Ranked" - 6 (icon: trophy, magenta text)

**Section 3: Recent Activity Feed**

- Timeline list (left-aligned):

  - "Judge Sarah scored submission 'AI Resume Analyzer'" - 2 hours ago

  - "New submission: 'ML Chatbot'" - 4 hours ago

  - "Judging window closes in 2 hours" - badge (warning yellow)

- Each item has small icon (left) and timestamp (right)

---

## PAGE 2: EVENT SETUP & ROUND CONFIGURATION

### Left Sidebar

- Tabs: "Event Details" | "Rounds" | "Judges" | "Rubric"

### Center Content Area (Event Details Tab)

- Form fields:

  - Event Name: input field

  - Description: textarea

  - Logo Upload: drag-drop area (show PLP logo placeholder)

  - Brand Colors: 2 color pickers (teal + magenta)

  - Save button (filled teal)

### Center Content Area (Rounds Tab)

- "Add Round" button (teal, top-right)

- Round cards stacked vertically:

  - Each card has:

    - Round name (bold, teal)

    - Phase badge: "Submissions" | "Judging" | "Results" (pill-shaped, teal border)

    - Deadline: "Closes June 15, 2026" (gray text)

    - Submission method: "Google Forms" (pill, magenta background)

    - 2 action buttons: "Configure Rubric" (outline teal) | "Assign Judges" (outline magenta)

    - Expand/collapse arrow

---

## PAGE 3: JUDGE SCORING INTERFACE

### Layout: Split Screen

**Left Panel (30% width)**

- Header: "Submissions (8)" 

- Filter dropdown: "All Categories" | "Category A" | "Category B"

- Search bar: "Search submissions..."

- Scrollable list of submissions:

  - Each item:

    - Title (bold): "AI Resume Analyzer"

    - Submitter name (gray): "Alice Johnson"

    - Category badge (teal pill): "AI/ML"

    - Status badge (magenta pill): "Pending"

    - Selected state: left border teal (3px), light teal background

**Right Panel (70% width)**

**Section A: Submission Details**

- Submission title (large, bold, teal)

- Description text (gray)

- Media preview section:

  - "GitHub" link button (teal icon + text, underline hover)

  - "YouTube" link button (magenta icon + text, underline hover)

  - PDF preview (if applicable)

- Metadata: "Submitted: June 10, 2026 @ 2:30 PM"

**Section B: Rubric & Scoring**

- Rubric title (bold, teal): "Innovation & Impact"

- Scoring criteria cards (3 rows):

  - Each row contains:

    - Criteria name (bold): "Originality"

    - Radio buttons or number input: 1-5 scale (teal selection)

    - Score indicator: "5/5" (right-aligned, gray)

- Comments textarea:

  - Label: "Feedback (Visible to Submitter)"

  - Input field (light gray border)

  - Toggle below: "Private Notes" (smaller checkbox, magenta text when checked)

- Bottom actions:

  - "Save & Next" button (filled teal, full width)

  - Progress indicator: "Submission 3 of 8" (gray, center-aligned)

**Blind Judging Indicator** (top-right of right panel)

- Icon + text: "Blind Judging: ON" (lock icon, magenta text)

---

## DESIGN SPECIFICATIONS

**Typography:**

- Headings: Bold, dark gray/black

- Body text: Regular, #1A1A1A

- Secondary text: #666666 (lighter gray)

- Font family: Sans-serif (modern, professional)

**Spacing:**

- Padding: 16px, 24px, 32px (use consistently)

- Gap between cards: 16px

- Grid: 12-column responsive

**Buttons:**

- Primary (filled): Teal background, white text, 8px border-radius

- Secondary (outline): Teal or magenta border, white background, colored text

- Hover: Slightly darker shade, no shadow

- Disabled: Light gray background

**Cards:**

- White background, light gray border (1px), 8px border-radius

- Shadow: subtle (0 1px 3px rgba(0,0,0,0.1))

**Status Badges & Pills:**

- Pill-shaped (20px border-radius)

- Options: Teal background/white text, Magenta background/white text, Gray outline/dark text

- Font: Small (12px), semi-bold

**Icons:**

- 20px size, 2px stroke weight

- Colors: Teal, Magenta, or Dark Gray (contextual)

- Use: Settings, Search, Plus, ChevronDown, Lock, CheckCircle, Eye, Star, Trophy, ArrowRight

**Responsive Behavior:**

- Mobile: Stack panels vertically, full-width cards

- Tablet: 2-column layout where applicable

- Desktop: As specified above

---

## SAMPLE DATA TO POPULATE

Events:

- "TechHack 2026" (active)

- 3 rounds: "Submissions", "Round 1 Judging", "Finals"

Submissions:

1. "AI Resume Analyzer" by Alice Johnson, Category: AI/ML, Status: Scored, Score: 4.5/5

2. "ML Chatbot" by Bob Smith, Category: AI/ML, Status: Under Review

3. "IoT Smart Home Hub" by Carol Davis, Category: IoT, Status: Submitted

4. "Blockchain Voting App" by David Lee, Category: Blockchain, Status: Scored, Score: 4.8/5

5. "AR Education Game" by Eve Wilson, Category: AR/VR, Status: Pending

6. "Climate Data Dashboard" by Frank Brown, Category: Data Science, Status: Submitted

7. "Real-Time Translation API" by Grace Park, Category: NLP, Status: Under Review

8. "Autonomous Delivery Robot" by Henry Chen, Category: Robotics, Status: Scored, Score: 4.2/5

Judges:

- Sarah Mitchell (8 submissions scored)

- James Rodriguez (5 submissions scored)

- Emily Watson (2 submissions pending)

Rubric Criteria (sample):

- Originality (1-5)

- Feasibility (1-5)

- User Experience (1-5)

- Impact & Scale (1-5)

---

## INTERACTIONS TO INCLUDE

✅ Click submission in left panel → load details in right panel

✅ Click category filter → filter submissions list

✅ Adjust score radio buttons → real-time update

✅ Type in comments → save automatically

✅ Click "Save & Next" → load next submission, auto-scroll

✅ Toggle "Blind Judging" → hide/show submitter name

✅ Hover buttons → color darken effect

✅ Mobile: tap menu icon → slide-out navigation

---

## OUTPUT REQUIREMENTS

- Full interactive prototype

- 3 complete pages (Dashboard, Event Setup, Scoring Interface)

- Functional state management (form inputs, filtering, selection)

- Mobile responsive

- No placeholder text—use sample data

- Export as shareable link

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://hackyjudgy.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/054445b6-077b-4fe2-af45-a29494e75db7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
