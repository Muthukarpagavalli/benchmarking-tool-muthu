# Legal tech benchmarking tool — example project

Two components, as discussed:

1. **Market knowledge bank** — six categories (CLM, DMS, GenAI/Contract
   Review AI, E-Discovery, Legal Research DBs, Practice Management), each
   with a feature comparison matrix and a weighted scoring framework,
   modeled directly on the structure of the uploaded spreadsheet
   (`Legal_Tech_Market_Research_Muthu.xlsx`) — plus a running News &
   Updates Log. Each category also now shows an editable **"Our firm"**
   row at the top of the feature matrix (adopted / evaluating / not
   adopted per tool) — this is what makes the peer reports below into a
   real gap analysis instead of just peer trivia.
2. **Peer firm benchmarking** — a sourced log of what peer firms are
   adopting, plus two report types:
   - **Firm-centric report** — pick a peer firm, see everything logged
     about them across every category, with your own firm's adoption
     status shown alongside each sighting.
   - **Tool-centric report** — pick a tool, see its full adoption
     timeline across peer firms (who, when), plus your own status for
     that tool.
3. **Top bar on every page** — page title plus quick stats (categories,
   tools tracked, peer firms, sightings logged).

All the vendor data seeded here is real, sourced research (not
placeholder) — see the notes column on each feature matrix cell.

## Prerequisites

- Node.js 18+ and npm
- Docker Desktop (for SQL Server)

## 1. Start the database

```bash
docker compose up -d
```

## 2. Configure environment variables

```bash
cp .env.example .env
```

## 3. Install dependencies

```bash
npm install
```

If it complains about install scripts:
```bash
npm approve-scripts @prisma/client @prisma/engines esbuild prisma
npm install
```

## 4. Set up the database

```bash
npm run db:migrate
```

The schema changed since the first version (added the "our firm" status
field on Tool) — if you're migrating from an earlier run, say yes when
it asks to reset. This seeds all six categories with their tools,
feature matrices, the 10-criterion weighted scoring framework (weights
corrected to sum to 100% — the original template's example weights
summed to 110%), and a few example "our firm" statuses (edit
`OUR_FIRM_STATUS` in `prisma/seed.ts` to match your actual stack).

## 5. Run it

```bash
npm run dev
```

Open http://localhost:3000

## Trying it out

1. From the dashboard, click into any category (e.g. **CLM**).
2. Note the **Our firm** row at the very top of the feature matrix —
   click a status pill to cycle adopted / evaluating / not adopted /
   unknown, same interaction as the other status pills.
3. On the **Feature comparison matrix** tab, click any other status pill
   to cycle yes → partial → no → unknown, and click a notes field to
   edit it directly.
4. Switch to the **Weighted scoring framework** tab, enter scores 1-5 per
   tool per criterion, and watch the total weighted score at the bottom
   recalculate live.
5. Visit **News & updates log** to see the running log, filter by
   category, and add a new entry.
6. Visit **Peer benchmarking** — add a peer firm, log a sourced
   "sighting," then try both reports:
   - **Firm-centric report**: pick a peer firm, see everything logged
     about them with your own adoption status alongside each sighting.
   - **Tool-centric report**: pick a tool, see its adoption timeline
     across peers, with your own status for that tool shown at the top.

## Where to extend this next

- **Vendor data for capabilities beyond the 5-6 seeded per category** —
  each category's spreadsheet template originally had 10 capability
  rows; this build seeds the highest-signal 5-6 per category to keep the
  build manageable, with room to add the rest the same way.
- **"Our firm's chosen tool" marker** — right now "where we stand" only
  shows peer adoption frequency; adding a field for which tool your own
  firm has actually adopted per category would let the summary show a
  real side-by-side gap, not just peer frequency alone.
- **Export back to Excel** — since the original research lived in a
  spreadsheet, a "download as .xlsx" button using the same layout would
  make this easy to share with people who aren't using the web app.
