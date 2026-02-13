# Task: Extract Training Data from 25 Production Files

## The Problem
- Source files are in iCloud Drive (`~/Library/Mobile Documents/com~apple~CloudDocs/Henry-ClientDocs/reference-data/`)
- **Many files aren't actually downloaded locally** - they show as existing but fail when read
- Previous attempts hit "Resource deadlock avoided" and "File is not a zip file" errors
- Need to extract: script features, budget totals, shoot days from 25 production projects

## What Works
✅ **pdftotext command-line tool** - Use subprocess to call `pdftotext -l 10 <file> -` instead of pdfplumber
✅ **Manifest file** - `/training_data_extract.json` maps all 25 projects to their files
✅ **Libraries installed** - openpyxl, xlrd available (but files need to be readable first)

## What Doesn't Work
❌ **pdfplumber** - Hits file lock errors on iCloud files
❌ **Direct file copy** - cp/rsync/ditto all fail with "Resource deadlock avoided"
❌ **openpyxl on iCloud files** - "File is not a zip file" because not downloaded

## Your Task

### 1. Force iCloud Download
Use `brctl download <path>` to force-download files before processing:
```bash
brctl download ~/Library/.../reference-data/budgets/*.xlsx
```

OR try reading files with a small buffer first to trigger download.

### 2. Extract Data Using pdftotext
For PDFs, use subprocess:
```python
subprocess.run(['pdftotext', '-l', '10', str(pdf_path), '-'], capture_output=True, text=True, timeout=30)
```

### 3. Parse Excel Files
- `.xlsx` → openpyxl
- `.xls` (old format) → xlrd
- Scan for large numbers (10,000-10,000,000 range)
- Look for GBP amounts (£xxx,xxx)

### 4. Extract These Features

**From Scripts:**
- Techniques: moco, drone, vfx, tracking, night shoots, etc.
- Locations: studio, outdoor, indoor
- Estimated shot count
- Special requirements: children, animals, vehicles

**From Budgets:**
- Total cost in GBP (look for largest number found)
- Currency: Most are GBP, some EUR (note which)

**From Schedules:**
- Number of shoot days
- Call times found

## Output Format
Save to: `./training-data/training_data_final.json`

```json
{
  "project_name": "Smirnoff",
  "client": "Smirnoff",
  "complete": true,
  "script_features": {
    "techniques": ["drone", "tracking"],
    "locations": ["outdoor"],
    "estimated_shots": 42,
    "has_children": false,
    "has_animals": false,
    "has_vehicles": true,
    "text_length": 3251
  },
  "budget_data": {
    "total_gbp": 237000.00,
    "source": "xlsx",
    "currency": "GBP"
  },
  "schedule_data": {
    "shoot_days": 4,
    "call_times_found": 4
  }
}
```

## Success Criteria
- ✅ Process all 25 projects without crashing
- ✅ Extract budget from 15+ projects (60%+)
- ✅ Extract schedule from 12+ projects (48%+)
- ✅ Extract script features from 20+ projects (80%+)

## Files Already Created
- `extract_training_data.py` - first version (skipped Excel, got file locks)
- `extract_training_data_v2.py` - tried pdfplumber (hit file locks)
- `extract_with_pdftotext.py` - uses pdftotext but files still not downloaded

You can start from `extract_with_pdftotext.py` and add iCloud download logic.

## Key Insight
The files LOOK like they exist (Path.exists() returns True) but they're just placeholders. You need to either:
1. Force download them with `brctl download` first
2. OR copy them to a local temp folder (which triggers download)
3. OR open them in a way that triggers iCloud to download

Good luck! 🚀
