# About the Production Feasibility Engine

## This Isn't a Script Analyzer

It's a production intelligence platform that thinks like a seasoned producer.

---

## The Problem

**Early-stage production planning runs on:**
- Excel spreadsheets
- Gut feel
- "It'll probably work out"
- Lessons learned the expensive way

**Experienced producers know:**
- MOCO kills your schedule (3-4 setups max, not 7)
- "10 VFX shots" actually means 20-40 plate passes
- Children under 5 have a 2-hour performance window
- Russian Arm days cost 4-5x normal days
- Outdoor shoots need weather contingency
- Match cuts take longer than they sound

**But that knowledge lives in their heads.**

Junior producers learn it by making expensive mistakes. Agencies underestimate because they don't know. Clients get shocked when reality hits.

---

## The Solution

**Cache the expertise.**

Take 15+ years of production knowledge - the hard-won lessons, the timing reality, the cost patterns, the schedule killers - and encode it as rules an AI can apply.

**Not automation. Amplification.**

One experienced producer's knowledge → available to everyone, instantly.

---

## What "Encoded Expertise" Means

### Example 1: MOCO

**Naive approach:**
- Script mentions "MOCO"
- Budget adds line item for MOCO rental
- Schedule shows 7 setups for the day
- **Result:** Disaster on set (MOCO allows 3-4 setups max)

**Encoded expertise approach:**
- Script parser detects "MOCO" or "motion control"
- Rules engine checks setup count
- **Condition:** MOCO mentioned + >4 setups scheduled
- **Flag:** "MOCO allows 3-4 setups maximum. Current schedule shows 7."
- **Challenge:** "Add dedicated MOCO day or reduce setup count"
- **Why it knows:** Because producers who've used MOCO taught it

### Example 2: VFX Plates (The Multiplication Problem)

**Naive approach:**
- Script: "Man throws ball to dog" (1 scene)
- Budget: 1 setup
- **Reality:** Need 4 plates (action + clean + dog-only + sky for CG bird)

**Encoded expertise approach:**
- Detects VFX in scene
- Knows 1 VFX shot = 2-4 actual plates
- **Multiplies setup count:** "10 VFX shots" → 20-40 actual setups
- **Flag:** "VFX setup count mismatch"
- **Why it knows:** Because VFX supervisors taught it

### Example 3: Children Under 5

**Naive approach:**
- Script has kid
- Budget for child actor
- Standard 10-hour day scheduled
- **Reality:** 2-hour performance window (legal maximum)

**Encoded expertise approach:**
- Detects children in script
- Age entered → applies UK legal hours
- **Under 5:** Max 2hrs performance, usually need twins
- **Flag:** "Children under 5 restrict shooting window to 2 hours"
- **Challenge:** "Budget for twins/doubles, plan child scenes for best energy window"
- **Why it knows:** Because producers who've worked with children taught it

---

## Models Are Smart People Caches

**That's what this is.**

Not a database query.  
Not a formula in Excel.  
Not generic automation.

**It's the knowledge of producers who:**
- Spent 15+ years on set
- Made mistakes and learned
- Negotiated budgets that worked (and ones that didn't)
- Watched schedules collapse from preventable issues
- Know what "actually costs" vs what clients want to pay

**Cached. Encoded. Queryable.**

---

## The Knowledge Sources

### APA Guidelines (Industry Standards)
- 11-hour working days (10 working + 1 lunch)
- Overtime grades and rates
- Night shoot premiums (2x rate)
- After-midnight premiums (3x rate)
- **Why included:** Industry standard = baseline reality

### Real Production Data
- UK per-day costs: £85-250k (varies by complexity, not just scale)
- EU service company costs by country
- HOD rates (DOP £3k, 1st AD £900, etc.)
- Post-production floors (£80k minimum, not aspirational)
- **Why included:** Market reality from actual budgets

### Schedule Reality (AD Experience)
- 45 minutes per setup (not "shot" - multiple shots per setup)
- Company moves: 105 minutes total (60 travel + 45 re-setup)
- MOCO: 60-90 minutes per setup
- Technical shots: 75+ minutes
- **Why included:** Timing from actual shoot days

### Technique Complexity (Hard-Won Lessons)
- MOCO: 3-4 setups/day
- Russian Arm: 2-3 setups/day, £15-25k
- Stop Motion: 3-5 seconds/day (cheap crew, takes time)
- Product Hero: 45-75 mins per shot (never quick)
- VFX Plates: 1 shot = 2-4 plates (multiplication)
- **Why included:** Lessons learned the expensive way

### Children's Hours (UK Law)
- Under 5: 2hrs performance max
- Ages 5-8: 3hrs performance max
- Ages 9+: 5hrs performance max
- Chaperone mandatory
- **Why included:** Legal requirement = non-negotiable

### Talent Usage (UK Advertising Standards)
- BSF: £350/day principal, £500 walk-on
- Usage (UK): £4.5-5.5k per principal (1yr, all media)
- Usage (Worldwide): £10-14k per principal
- **Why included:** Actual union/industry rates

---

## What This Enables

### For Junior Producers
**Before:** "I think 5 days should be enough?"  
**With tool:** "Schedule simulation shows 6.5 days needed. Day 3 is overloaded (14 hours). Add 2 days or reduce company moves."

**Before:** "We budgeted £80k for post"  
**With tool:** "Multiple deliverables (TVC + social + cutdowns) require £130k minimum. Current allocation is under floor."

### For Experienced Producers
**Before:** Manual validation of agency budgets (2-3 hours per job)  
**With tool:** Upload script → instant feasibility check → focus on nuanced issues

**Before:** "I know this won't work but I need to prove why"  
**With tool:** Printable report showing exactly where it breaks

### For Agencies
**Before:** Assumptions based on last year's job  
**With tool:** Reality check before bidding

### For Clients
**Before:** "Why does this cost so much?"  
**With tool:** Transparent breakdown showing cost drivers

---

## What It's NOT

❌ **Not a replacement for experienced producers**  
✅ A tool to amplify their expertise

❌ **Not a full line-item budget system**  
✅ An early-stage feasibility reality check

❌ **Not generic automation**  
✅ Encoded production intelligence

❌ **Not a "lazy mode"**  
✅ A smart people cache

---

## The Philosophy

**Production knowledge is tribal.**

It lives in the heads of people who've been on hundreds of sets. It gets passed down through experience, mistakes, and war stories.

**But it doesn't scale.**

One senior producer can only be on one job at a time. Their expertise helps one client, one agency, one project.

**Unless you encode it.**

Then that knowledge becomes:
- Instantly accessible
- Consistently applied
- Continuously improved
- Scalable to 100 jobs simultaneously

**This tool is that encoding.**

Not replacing people. Multiplying their impact.

---

## Who Built This

A production team who:
- Lived through 15+ years of commercial production
- Made (and learned from) every mistake in this tool
- Wished something like this existed when they were starting
- Built it because production planning deserves better than Excel + gut feel

**With knowledge contributions from:**
- Senior agency producers
- Experienced 1st ADs
- VFX supervisors
- Production designers
- Line producers who've budgeted 100+ jobs

**Their collective knowledge → encoded here.**

---

## What's Next

### Continuous Learning
- More rules from more producers
- Technique complexity database (100+ techniques catalogued)
- Regional variations (US, APAC production patterns)
- Historical learning (actual vs estimated feedback loop)

### Deeper Intelligence
- Script type awareness (TVC vs music video vs narrative)
- Location complexity tiers (studio vs outdoor vs remote)
- Weather contingency by season and region
- Crew availability patterns

### Integration
- Synthetic training data generation
- AI fine-tuning on production patterns
- Automated feasibility at treatment stage
- Real-time budget validation

**The vision:** Every production decision informed by 100+ years of collective experience.

---

## The Bottom Line

**This isn't about replacing producers.**

It's about making sure every production starts from a foundation of expert knowledge.

So junior producers don't make expensive mistakes.  
So experienced producers don't waste time on preventable issues.  
So agencies can bid realistically.  
So clients understand what actually costs.

**One tool. Decades of knowledge. Available in seconds.**

---

**Not lazy automation. Encoded expertise.**

Built for professionals who know that production intelligence matters.
