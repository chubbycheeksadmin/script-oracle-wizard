#!/usr/bin/env python3
"""
Simple production data extractor
Processes projects one at a time, handles large files gracefully
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict, Any
import re

# Simple text extraction - no heavy libraries
def extract_text_from_pdf_simple(pdf_path: Path, max_pages: int = 5) -> str:
    """Extract text using pdftotext if available, otherwise skip"""
    try:
        import subprocess
        result = subprocess.run(
            ['pdftotext', '-l', str(max_pages), str(pdf_path), '-'],
            capture_output=True,
            text=True,
            timeout=10
        )
        return result.stdout[:10000]  # First 10k chars only
    except Exception as e:
        return f"[PDF extraction failed: {e}]"

def extract_features_from_script(text: str) -> Dict[str, Any]:
    """Extract key features from script text"""
    text_lower = text.lower()
    
    # Technique detection
    techniques = []
    technique_keywords = {
        'moco': ['moco', 'motion control'],
        'drone': ['drone', 'aerial'],
        'tracking': ['tracking shot', 'tracking'],
        'vfx': ['vfx', 'visual effects', 'green screen'],
        'night_shoot': ['night shoot', 'night exterior'],
        'underwater': ['underwater'],
        'crane': ['crane shot', 'crane'],
        'steadicam': ['steadicam'],
        'handheld': ['handheld']
    }
    
    for tech, keywords in technique_keywords.items():
        if any(kw in text_lower for kw in keywords):
            techniques.append(tech)
    
    # Location detection
    locations = []
    if 'studio' in text_lower:
        locations.append('studio')
    if any(word in text_lower for word in ['exterior', 'outdoor', 'location']):
        locations.append('outdoor')
    if 'interior' in text_lower:
        locations.append('indoor')
    
    # Estimate shot count from scene numbers
    shot_matches = re.findall(r'shot\s+\d+|scene\s+\d+', text_lower)
    estimated_shots = len(shot_matches) if shot_matches else None
    
    return {
        'techniques': techniques,
        'locations': locations,
        'estimated_shots': estimated_shots
    }

def extract_from_budget_simple(budget_path: Path) -> Dict[str, Any]:
    """Simple budget extraction - just look for total amounts"""
    try:
        # Try to read as text and look for currency amounts
        if budget_path.suffix.lower() == '.pdf':
            text = extract_text_from_pdf_simple(budget_path, max_pages=10)
        else:
            # Skip Excel for now - too likely to crash
            return {'total_gbp': None, 'note': 'Excel parsing skipped'}
        
        # Look for GBP amounts
        gbp_matches = re.findall(r'£\s*([\d,]+)', text)
        if gbp_matches:
            # Take the largest number found
            amounts = [int(m.replace(',', '')) for m in gbp_matches]
            return {'total_gbp': max(amounts), 'source': 'extracted'}
        
        return {'total_gbp': None, 'note': 'No GBP amounts found'}
        
    except Exception as e:
        return {'total_gbp': None, 'error': str(e)}

def extract_from_schedule_simple(schedule_path: Path) -> Dict[str, Any]:
    """Simple schedule extraction - count days"""
    try:
        if schedule_path.suffix.lower() == '.pdf':
            text = extract_text_from_pdf_simple(schedule_path, max_pages=10)
        else:
            text = schedule_path.read_text(errors='ignore')[:10000]
        
        text_lower = text.lower()
        
        # Count day references
        day_matches = re.findall(r'day\s+(\d+)', text_lower)
        shoot_days = max([int(d) for d in day_matches]) if day_matches else None
        
        # Look for call times
        call_times = re.findall(r'call[:\s]+(\d+)[:\.](\d+)', text_lower)
        
        return {
            'shoot_days': shoot_days,
            'call_times_found': len(call_times)
        }
        
    except Exception as e:
        return {'shoot_days': None, 'error': str(e)}

def process_project(project: Dict[str, Any], base_path: Path) -> Dict[str, Any]:
    """Process a single project"""
    project_name = project.get('project_name', 'Unknown')
    print(f"Processing: {project_name}")
    
    result = {
        'project_name': project_name,
        'complete': project.get('complete', False),
        'script_features': {},
        'budget_data': {},
        'schedule_data': {}
    }
    
    files = project.get('files', {})
    
    # Process script
    if 'script' in files:
        script_file = files['script']
        if isinstance(script_file, dict) and 'path' in script_file:
            script_path = Path(script_file['path'])
            if script_path.exists():
                print(f"  - Extracting script: {script_path.name}")
                text = extract_text_from_pdf_simple(script_path)
                result['script_features'] = extract_features_from_script(text)
    
    # Process budget
    if 'budget' in files:
        budget_file = files['budget']
        if isinstance(budget_file, dict) and 'path' in budget_file:
            budget_path = Path(budget_file['path'])
            if budget_path.exists():
                print(f"  - Extracting budget: {budget_path.name}")
                result['budget_data'] = extract_from_budget_simple(budget_path)
        elif isinstance(budget_file, list):
            for bf in budget_file:
                if isinstance(bf, dict) and 'path' in bf:
                    budget_path = Path(bf['path'])
                    if budget_path.exists():
                        print(f"  - Extracting budget: {budget_path.name}")
                        result['budget_data'] = extract_from_budget_simple(budget_path)
                        break
    
    # Process schedule
    if 'schedule' in files:
        schedule_file = files['schedule']
        if isinstance(schedule_file, dict) and 'path' in schedule_file:
            schedule_path = Path(schedule_file['path'])
            if schedule_path.exists():
                print(f"  - Extracting schedule: {schedule_path.name}")
                result['schedule_data'] = extract_from_schedule_simple(schedule_path)
        elif isinstance(schedule_file, list):
            for sf in schedule_file:
                if isinstance(sf, dict) and 'path' in sf and sf.get('exists', False):
                    schedule_path = Path(sf['path'])
                    if schedule_path.exists():
                        print(f"  - Extracting schedule: {schedule_path.name}")
                        result['schedule_data'] = extract_from_schedule_simple(schedule_path)
                        break
    
    print(f"  ✓ Done")
    return result

def main():
    # Paths
    base_path = Path.home() / "Library/Mobile Documents/com~apple~CloudDocs/Henry-ClientDocs/reference-data"
    manifest_path = base_path / "training_data_extract.json"
    output_dir = Path.home() / "clawd/projects/Production Script Platform/production-feasibility-engine/training-data"
    
    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Load manifest
    print(f"Loading manifest: {manifest_path}")
    with open(manifest_path) as f:
        manifest = json.load(f)
    
    projects = manifest.get('projects', [])
    print(f"Found {len(projects)} projects to process\n")
    
    # Process each project
    results = []
    for i, project in enumerate(projects, 1):
        print(f"\n[{i}/{len(projects)}]")
        try:
            result = process_project(project, base_path)
            results.append(result)
            
            # Save incrementally
            output_path = output_dir / "training_data_partial.json"
            with open(output_path, 'w') as f:
                json.dump(results, f, indent=2)
                
        except Exception as e:
            print(f"  ✗ Failed: {e}")
            results.append({
                'project_name': project.get('project_name', 'Unknown'),
                'error': str(e)
            })
    
    # Final save
    print(f"\n\n{'='*60}")
    print("EXTRACTION COMPLETE")
    print(f"{'='*60}")
    
    output_path = output_dir / "training_data_complete.json"
    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\nSaved to: {output_path}")
    
    # Quick summary
    successful = sum(1 for r in results if 'error' not in r)
    with_budget = sum(1 for r in results if r.get('budget_data', {}).get('total_gbp'))
    with_schedule = sum(1 for r in results if r.get('schedule_data', {}).get('shoot_days'))
    
    print(f"\nSummary:")
    print(f"  Total projects: {len(results)}")
    print(f"  Successful: {successful}")
    print(f"  With budget data: {with_budget}")
    print(f"  With schedule data: {with_schedule}")

if __name__ == '__main__':
    main()
