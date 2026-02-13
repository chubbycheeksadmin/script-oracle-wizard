# Production Feasibility Engine

**15+ years of senior producer expertise, encoded.**

This isn't a lazy script analyzer. It's a production intelligence platform that thinks like a seasoned producer and 1st AD - because it was trained on their real-world knowledge.

## What This Is

A feasibility reality-check that embodies the experience of professionals who've:
- Budgeted 100+ commercial productions
- Learned (the hard way) that MOCO kills your schedule
- Discovered that "10 VFX shots" actually means 20-40 plate passes
- Been burned by underestimating children's legal hours
- Negotiated Russian Arm days that blow timelines

**This tool captures that hard-won knowledge** and makes it instantly accessible.

---

## What It Does

- Breaks down scripts like an experienced agency/production producer would
- Simulates realistic shooting schedules using AD-style time rules
- Returns a feasibility verdict (GREEN/AMBER/RED) with required shoot days
- Produces indicative production budget bands (UK APA / EU service-company modes)
- Estimates post-production allowances (floors and bands)
- Breaks down talent categories and usage exposure
- Runs PIBS-style completeness check: is the budget client-safe?

**This IS:**
- An early-stage feasibility system
- A senior producer's reality check
- Encoded production intelligence

**This is NOT:**
- A full Movie Magic line budget
- A legal/contracts generator
- A replacement for experienced producers

---

## The Knowledge Base

### Schedule Intelligence (AD-Style Rules)

**From real production experience:**
- Standard day: 11 hours (10 working + 1 lunch) - **APA standard**
- Turnover buffer: 90 minutes (crew call to first shot) - **reality, not wishful thinking**
- Average setup: 45 minutes - **proven on 100+ shoots**
- Technical/MOCO shots: 60-90 minutes minimum - **learned the hard way**
- Company move: 105 minutes total (60 travel + 45 re-setup) - **time every producer underestimates**

**Technique complexity from real shoots:**
- MOCO: 3-4 setups/day (not the 7 agencies assume)
- Russian Arm: 2-3 setups/day + £20k
- VFX plates: 1 shot = 2-4 actual plates (the multiplication problem)
- Product hero shots: 45-75 mins each (never "quick")
- Stop motion: 3-5 seconds/day output (cheap crew, takes time)

### Budget Intelligence (Real UK Market Costs)

**Per-day production costs (2025 UK rates):**
- Simple: £85-140k/day
- Standard: £150-200k/day
- Ambitious: £200-250k/day

**Complexity drives per-day cost:**
- Not just number of days
- MOCO day costs 3-4x standard
- Russian Arm day costs 4-5x standard
- Location complexity affects efficiency (studio 100%, outdoor 70-80%)

### HOD Rates (Apply to ALL budgets - UK & EU)

**Senior crew planning rates:**
- Director: £10-14k/day (tiered by experience)
- DOP: £3,000/shoot day
- 1st AD: £900/shoot day
- Production Designer: £950/shoot day
- Wardrobe Stylist: £850/shoot day
- Travel days: 50% of shoot-day rate

### Post-Production Floors (Hard-Won Knowledge)

- Minimum (any TVC): £80k (online + grade + sound + music + deliverables)
- Multiple deliverables: £130k minimum
- VFX Heavy: £120-180k

**Why these floors?** Because experienced producers know what actually costs to finish properly.

### Talent Usage (UK Advertising Standards)

**Per person, per year, all media:**

| Territory | Principal Featured | Secondary Featured |
|-----------|-------------------|-------------------|
| UK only (1yr) | £4,500-5,500 | £2,700-3,300 |
| US only (1yr) | £7,000-9,000 | £4,500-5,500 |
| Worldwide (1yr) | £10,000-14,000 | £6,000-9,000 |

BSF (Basic Session Fee): £350/day principal, £500/day walk-on

### Children's Legal Hours (UK Regulations - Critical)

**From actual production constraints:**
- Under 5: Max 2 hours performance (often need twins)
- Ages 5-8: Max 3 hours performance
- Ages 9+: Max 5 hours performance
- Chaperone mandatory: £350-500/day

**Why this matters:** Producers who forget this blow their schedule by 30%.

---

## Verdict System

**Not arbitrary - based on production risk patterns:**

- **GREEN** (0.0-3.0): Low risk, 0-10% expected overrun
- **AMBER** (3.1-6.5): Medium risk, 10-25% expected overrun  
- **RED** (6.6-10.0): High risk, 25-50% expected overrun

**Risk score accumulates from real production red flags:**
- Schedule overload (too many setups per day)
- Excessive company moves (3+ per day)
- MOCO without time allowance
- Children without hour buffer
- No contingency in budget
- Post-production underscoped

---

## The Intelligence Behind It

### Rules Engine

Every rule comes from real production experience:

**Example - "schedule-overload" rule:**
```typescript
{
  id: 'schedule-overload',
  condition: (input, schedule) => schedule.days.some(d => d.isOverloaded),
  explanation: 'X day(s) exceed 10-hour working time. Minutes required exceeds available.',
  challenge: 'Add shoot days or reduce scope per day.',
  // Why: Because every producer has tried to cram 12 hours into 10 and regretted it.
}
```

**Example - "moco-mentioned" rule (hypothetical - should exist):**
```typescript
{
  id: 'moco-time-sink',
  condition: (input) => input.complexity.moco && input.avgSetupsPerDay > 4,
  explanation: 'MOCO mentioned but schedule shows 7+ setups/day. MOCO allows 3-4 maximum.',
  challenge: 'Reduce setup count to 3-4 per day or add MOCO-specific days.',
  // Why: Because MOCO ALWAYS takes longer than anyone thinks.
}
```

### Script Parser Intelligence

**Looks for what experienced producers look for:**
- Scene headers (INT/EXT/DAY/NIGHT)
- Location variety (company moves = time)
- Technical keywords: crane, dolly, steadicam, MOCO, Russian arm
- Hero product keywords: pack shot, pour, splash, hero
- VFX keywords: composite, green screen, tracking, removal
- Talent complexity: dialogue, multiple characters, children

**Not just pattern matching - understanding production implications.**

---

## Cost Modes

### UK (APA Mode)
- APA working day assumptions
- UK producer heuristics
- Based on real London/UK market rates

### EU Service Company Mode
- Countries: Poland, Bulgaria, Czech, Serbia, Georgia, Spain, Portugal
- Per-day costs vary by country (£60-165k/day depending)
- FX buffers included (2-3% to protect against volatility)
- Short shoots (≤2 days) have higher per-day burn
- 4+ day shoots improve efficiency
- UK above-the-line crew costs added (travel, hotels, per diems)

**Why EU mode exists:** Because experienced producers know the real cost of flying a UK crew to Warsaw.

---

## Quick Start

```bash
cd production-feasibility-engine
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
src/
├── app/                    # Next.js app router
├── lib/
│   ├── parser/            # Script parsing (looks for what producers look for)
│   ├── breakdown/         # Main assessment engine
│   ├── schedule/          # Schedule simulation (AD rules)
│   ├── rules/             # Rules engine (encoded production knowledge)
│   ├── cost/              # Cost estimation (real market rates)
│   │   ├── constants.ts   # All rates/rules in one place
│   │   └── estimator.ts
│   └── pibs/              # PIBS checker (client-safety)
└── types/
    └── index.ts           # TypeScript definitions
```

---

## How to Add Rules (Encoding More Knowledge)

Rules are defined in `src/lib/rules/engine.ts`:

```typescript
{
  id: 'your-learned-lesson',
  description: 'The thing you learned the hard way',
  category: 'schedule' | 'creative' | 'post' | 'budget' | 'politics' | 'talent' | 'pibs',
  condition: (input, schedule) => /* when does this lesson apply? */,
  scoreDelta: 0.5, // How risky is this?
  generateFlag: (input, schedule) => ({
    ruleId: 'your-learned-lesson',
    title: 'What went wrong',
    explanation: 'Why it matters',
    challenge: 'How to fix it',
    severity: 'low' | 'medium' | 'high',
  }),
}
```

**Each rule = one lesson from the field.**

---

## Configurable Constants (The Knowledge Base)

All production intelligence in `src/lib/cost/constants.ts`:

### Schedule Constants (APA + Real Experience)
```typescript
SCHEDULE_CONSTANTS = {
  totalDayMinutes: 660,        // 11 hours (APA standard)
  workingMinutes: 600,         // 10 hours working
  lunchMinutes: 60,            // 1 hour lunch (mandatory)
  turnoverMinutes: 90,         // 1.5 hours (reality buffer)
  avgSetupMinutes: 45,         // Per setup (not "shot")
  avgShotsPerSetup: 3,         // Multiple shots per setup
  technicalSetupMinutes: 75,   // MOCO, hero product, etc.
  companyMoveMinutes: 60,      // Travel time
  companyMoveResetMinutes: 45, // Re-setup after move
}
```

### EU Country Costs (2025 Market Rates)
```typescript
EU_COUNTRY_COSTS = {
  Poland: { lean: 90k, standard: 115k, ambitious: 145k },
  Bulgaria: { lean: 70k, standard: 95k, ambitious: 120k },
  Czech: { lean: 95k, standard: 120k, ambitious: 150k },
  Serbia: { lean: 65k, standard: 90k, ambitious: 115k },
  Georgia: { lean: 60k, standard: 85k, ambitious: 110k },
  Spain: { lean: 105k, standard: 130k, ambitious: 165k },
  Portugal: { lean: 95k, standard: 115k, ambitious: 145k },
}
```

### Children's Working Hours (UK Law)
```typescript
CHILDREN_WORKING_HOURS = {
  under5: {
    maxTotalHours: 5,
    maxPerformanceHours: 2,
    description: 'Children under 5: max 5hrs on set, 2hrs performance',
  },
  age5to8: {
    maxTotalHours: 8,
    maxPerformanceHours: 3,
  },
  age9Plus: {
    maxTotalHours: 9.5,
    maxPerformanceHours: 5,
  },
}
```

**These aren't guesses - they're legal requirements and market reality.**

---

## PIBS Check (Client-Safety Intelligence)

**From experienced producers who've seen budgets blow up:**

Verifies presence of:
- Pre-production costs
- Shoot costs
- Director & Producer fees
- Talent (BSF + usage exposure)
- Travel & accommodation (EU shoots)
- Insurance & risk
- Post-production
- Contingency (minimum 5%)

**Budget cannot be GREEN if PIBS completeness fails.**

Why? Because client-safe means covering ALL the costs, not just the obvious ones.

---

## Tone & Philosophy

**Senior producer. Calm. Practical. No jargon. No false precision.**

This tool speaks like someone who's been on 100+ shoots and learned what actually matters.

Not academic. Not theoretical. **Practical production intelligence.**

---

## Assumptions & Limitations

- Indicative budgeting, not full line-item breakdowns
- Talent rates are planning heuristics, not contractual
- Schedule simulation uses greedy distribution (good enough for feasibility)
- No authentication (MVP - trust-based)
- Data not persisted (optional localStorage later)

**But the knowledge behind it is real.**

---

## What Makes This Different

**Most budget tools:** Generic formulas + databases

**This tool:** 15+ years of production experience encoded as rules

**Most schedule tools:** Optimistic math

**This tool:** AD-style reality checks from actual shoot days

**Most feasibility tools:** Don't exist (producers use Excel + gut feel)

**This tool:** Captures expert gut feel and makes it queryable

---

## For More Production Knowledge

See the companion knowledge base:

- `PRODUCTION_RULES.md` (722 lines of encoded expertise)
- `PRODUCTION_TECHNIQUES.md` (561 lines of technique complexity)
- `APA_GUIDELINES.md` (313 lines of crew engagement terms)

**These aren't documentation. They're smart people caches.**

---

Built for advertising production professionals who need an expert reality check before committing to numbers.

**Not lazy automation. Encoded expertise.**
