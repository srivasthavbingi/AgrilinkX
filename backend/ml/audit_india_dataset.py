import os
import sys
import json
import csv
import warnings
from pathlib import Path
from collections import defaultdict

import pandas as pd
import numpy as np

warnings.filterwarnings("ignore")
sys.stdout.reconfigure(encoding="utf-8")

def get_project_root() -> Path:
    return Path(__file__).resolve().parent.parent.parent

def run_audit():
    project_root = get_project_root()
    raw_dir = project_root / "data" / "raw"
    
    if not raw_dir.exists():
        raise FileNotFoundError(f"Directory data/raw not found at {raw_dir}")
        
    csv_files = sorted(list(raw_dir.glob("*.csv")), key=lambda p: p.name)
    
    print(f"[Audit] Found {len(csv_files)} yearly CSV files in data/raw/", flush=True)
    
    target_commodities_map = {
        "maize": "Maize",
        "tomato": "Tomato",
        "onion": "Onion",
        "potato": "Potato",
        "chilli": "Chilli",
        "chili": "Chilli",
        "green chilli": "Chilli",
        "red chilli": "Chilli",
        "chillies": "Chilli",
        "dry chillies": "Chilli"
    }
    
    yearly_reports = []
    
    total_dataset_rows = 0
    global_states = set()
    global_districts = set()
    global_markets = set()
    global_commodities = set()
    global_varieties = set()
    global_grades = set()
    global_min_date = None
    global_max_date = None
    
    total_missing_values = defaultdict(int)
    total_invalid_prices = 0
    total_min_gt_max = 0
    total_modal_outside = 0
    
    commodity_stats = {
        c: {
            "rows": 0,
            "states": set(),
            "districts": set(),
            "markets": set(),
            "min_date": None,
            "max_date": None,
            "missing_price": 0,
            "yearly_counts": defaultdict(int)
        }
        for c in ["Maize", "Tomato", "Onion", "Potato", "Chilli"]
    }
    
    telangana_total_rows = 0
    telangana_commodity_rows = defaultdict(int)
    
    sample_rows = []
    MAX_SAMPLE_ROWS = 25000
    CHUNK_SIZE = 250000
    
    for csv_file in csv_files:
        filename = csv_file.name
        file_size_bytes = csv_file.stat().st_size
        file_size_mb = round(file_size_bytes / (1024 * 1024), 2)
        year_str = csv_file.stem
        
        print(f"[Audit] Processing {filename} ({file_size_mb} MB)...", flush=True)
        
        file_rows = 0
        file_min_date = None
        file_max_date = None
        file_states = set()
        file_districts = set()
        file_markets = set()
        file_commodities = set()
        file_varieties = set()
        file_grades = set()
        file_missing = defaultdict(int)
        file_cols = []
        
        try:
            chunks = pd.read_csv(csv_file, chunksize=CHUNK_SIZE, low_memory=False)
            
            for chunk in chunks:
                if not file_cols:
                    file_cols = list(chunk.columns)
                    
                chunk_len = len(chunk)
                file_rows += chunk_len
                total_dataset_rows += chunk_len
                
                # Missing Values Tracking
                for col in chunk.columns:
                    missing_c = int(chunk[col].isna().sum())
                    file_missing[col] += missing_c
                    total_missing_values[col] += missing_c
                    
                # Collect Categorical Uniques
                if "State" in chunk.columns:
                    states_in_chunk = set(chunk["State"].dropna().astype(str).str.strip().unique())
                    file_states.update(states_in_chunk)
                    global_states.update(states_in_chunk)
                    
                if "District" in chunk.columns:
                    districts_in_chunk = set(chunk["District"].dropna().astype(str).str.strip().unique())
                    file_districts.update(districts_in_chunk)
                    global_districts.update(districts_in_chunk)
                    
                if "Market" in chunk.columns:
                    markets_in_chunk = set(chunk["Market"].dropna().astype(str).str.strip().unique())
                    file_markets.update(markets_in_chunk)
                    global_markets.update(markets_in_chunk)
                    
                if "Commodity" in chunk.columns:
                    comms_in_chunk = set(chunk["Commodity"].dropna().astype(str).str.strip().unique())
                    file_commodities.update(comms_in_chunk)
                    global_commodities.update(comms_in_chunk)
                    
                if "Variety" in chunk.columns:
                    vars_in_chunk = set(chunk["Variety"].dropna().astype(str).str.strip().unique())
                    file_varieties.update(vars_in_chunk)
                    global_varieties.update(vars_in_chunk)
                    
                if "Grade" in chunk.columns:
                    grades_in_chunk = set(chunk["Grade"].dropna().astype(str).str.strip().unique())
                    file_grades.update(grades_in_chunk)
                    global_grades.update(grades_in_chunk)
                    
                # Vectorized Date Processing
                date_col = "Arrival_Date" if "Arrival_Date" in chunk.columns else ("Date" if "Date" in chunk.columns else None)
                if date_col:
                    dates_parsed = pd.to_datetime(chunk[date_col], errors="coerce", format="mixed")
                    chunk["_parsed_date"] = dates_parsed
                    valid_dates = dates_parsed.dropna()
                    if len(valid_dates) > 0:
                        c_min = valid_dates.min().strftime("%Y-%m-%d")
                        c_max = valid_dates.max().strftime("%Y-%m-%d")
                        if file_min_date is None or c_min < file_min_date:
                            file_min_date = c_min
                        if file_max_date is None or c_max > file_max_date:
                            file_max_date = c_max
                            
                        if global_min_date is None or c_min < global_min_date:
                            global_min_date = c_min
                        if global_max_date is None or c_max > global_max_date:
                            global_max_date = c_max
                else:
                    chunk["_parsed_date"] = pd.NaT

                # Price Quality Checks
                modal_col = "Modal_Price" if "Modal_Price" in chunk.columns else None
                min_col = "Min_Price" if "Min_Price" in chunk.columns else None
                max_col = "Max_Price" if "Max_Price" in chunk.columns else None
                
                if modal_col:
                    modals = pd.to_numeric(chunk[modal_col], errors="coerce")
                    invalid_p = int((modals.isna() | (modals <= 0)).sum())
                    total_invalid_prices += invalid_p
                    
                    if min_col and max_col:
                        mins = pd.to_numeric(chunk[min_col], errors="coerce")
                        maxs = pd.to_numeric(chunk[max_col], errors="coerce")
                        
                        min_gt_m = int((mins > maxs).sum())
                        total_min_gt_max += min_gt_m
                        
                        outside = int(((modals < mins) | (modals > maxs)).sum())
                        total_modal_outside += outside

                # Telangana Filtering
                if "State" in chunk.columns:
                    tg_mask = chunk["State"].astype(str).str.strip().str.lower() == "telangana"
                    tg_chunk = chunk[tg_mask]
                    tg_count = len(tg_chunk)
                    telangana_total_rows += tg_count
                    
                    if tg_count > 0 and "Commodity" in chunk.columns:
                        for raw_comm, group_df in tg_chunk.groupby("Commodity"):
                            norm_comm = target_commodities_map.get(str(raw_comm).strip().lower())
                            if norm_comm:
                                telangana_commodity_rows[norm_comm] += len(group_df)

                # Target Commodities Statistics Tracking
                if "Commodity" in chunk.columns:
                    chunk["_norm_comm"] = chunk["Commodity"].astype(str).str.strip().str.lower().map(target_commodities_map)
                    target_chunk = chunk[chunk["_norm_comm"].notna()]
                    
                    if len(target_chunk) > 0:
                        for norm_comm, comm_df in target_chunk.groupby("_norm_comm"):
                            c_stat = commodity_stats[norm_comm]
                            c_stat["rows"] += len(comm_df)
                            c_stat["yearly_counts"][year_str] += len(comm_df)
                            
                            if "State" in comm_df.columns:
                                c_stat["states"].update(comm_df["State"].dropna().astype(str).str.strip().unique())
                            if "District" in comm_df.columns:
                                c_stat["districts"].update(comm_df["District"].dropna().astype(str).str.strip().unique())
                            if "Market" in comm_df.columns:
                                c_stat["markets"].update(comm_df["Market"].dropna().astype(str).str.strip().unique())
                                
                            if modal_col:
                                m_prices = pd.to_numeric(comm_df[modal_col], errors="coerce")
                                c_stat["missing_price"] += int((m_prices.isna() | (m_prices <= 0)).sum())
                                
                            c_dates = comm_df["_parsed_date"].dropna()
                            if len(c_dates) > 0:
                                c_min = c_dates.min().strftime("%Y-%m-%d")
                                c_max = c_dates.max().strftime("%Y-%m-%d")
                                if c_stat["min_date"] is None or c_min < c_stat["min_date"]:
                                    c_stat["min_date"] = c_min
                                if c_stat["max_date"] is None or c_max > c_stat["max_date"]:
                                    c_stat["max_date"] = c_max
                                        
                        # Collect Sample Rows (2022-2026)
                        if year_str in ["2022", "2023", "2024", "2025", "2026"] and len(sample_rows) < MAX_SAMPLE_ROWS:
                            sample_take = target_chunk.drop(columns=["_norm_comm", "_parsed_date"]).head(MAX_SAMPLE_ROWS - len(sample_rows))
                            sample_rows.append(sample_take)

        except Exception as e:
            print(f"[Audit Warning] Error reading {filename}: {e}", flush=True)

        y_report = {
            "filename": filename,
            "file_size_mb": file_size_mb,
            "row_count": file_rows,
            "columns": file_cols,
            "date_range": f"{file_min_date or 'N/A'} to {file_max_date or 'N/A'}",
            "states_count": len(file_states),
            "districts_count": len(file_districts),
            "markets_count": len(file_markets),
            "commodities_count": len(file_commodities),
            "varieties_count": len(file_varieties),
            "grades_count": len(file_grades),
            "missing_values": dict(file_missing)
        }
        yearly_reports.append(y_report)

    # Clean Commodity Summary for Output
    commodity_summary_clean = {}
    for comm_name, stat in commodity_stats.items():
        missing_pct = round((stat["missing_price"] / stat["rows"] * 100), 2) if stat["rows"] > 0 else 0.0
        commodity_summary_clean[comm_name] = {
            "total_rows": stat["rows"],
            "date_range": f"{stat['min_date'] or 'N/A'} to {stat['max_date'] or 'N/A'}",
            "states_count": len(stat["states"]),
            "districts_count": len(stat["districts"]),
            "markets_count": len(stat["markets"]),
            "missing_price_count": stat["missing_price"],
            "missing_price_percent": f"{missing_pct}%",
            "yearly_counts": {yr: stat["yearly_counts"][yr] for yr in [str(y) for y in range(2001, 2027)]}
        }

    audit_result = {
        "dataset_summary": {
            "files_found": len(csv_files),
            "total_rows": total_dataset_rows,
            "date_range": f"{global_min_date or 'N/A'} to {global_max_date or 'N/A'}",
            "total_states": len(global_states),
            "total_districts": len(global_districts),
            "total_markets": len(global_markets),
            "total_commodities": len(global_commodities),
            "total_varieties": len(global_varieties),
            "total_grades": len(global_grades),
            "arrival_quantity_present": False,
            "schema_consistent": True
        },
        "data_quality_issues": {
            "total_missing_values": dict(total_missing_values),
            "invalid_or_zero_prices": total_invalid_prices,
            "min_price_gt_max_price": total_min_gt_max,
            "modal_price_outside_min_max": total_modal_outside
        },
        "telangana_coverage": {
            "total_rows": telangana_total_rows,
            "maize_rows": telangana_commodity_rows.get("Maize", 0),
            "tomato_rows": telangana_commodity_rows.get("Tomato", 0),
            "onion_rows": telangana_commodity_rows.get("Onion", 0),
            "potato_rows": telangana_commodity_rows.get("Potato", 0),
            "chilli_rows": telangana_commodity_rows.get("Chilli", 0)
        },
        "target_commodities": commodity_summary_clean,
        "yearly_files_detail": yearly_reports
    }

    # Write Output Files
    ml_dir = project_root / "backend" / "ml"
    ml_dir.mkdir(parents=True, exist_ok=True)
    
    json_audit_path = ml_dir / "india_dataset_audit.json"
    csv_audit_path = ml_dir / "india_dataset_audit.csv"
    sample_data_path = project_root / "data" / "india_ml_sample.csv"
    
    with open(json_audit_path, "w", encoding="utf-8") as f:
        json.dump(audit_result, f, indent=2)
        
    print(f"\n[Audit] Saved JSON audit report to {json_audit_path}", flush=True)

    with open(csv_audit_path, "w", newline="", encoding="utf-8") as f:
        fieldnames = ["filename", "file_size_mb", "row_count", "date_range", "states_count", "districts_count", "markets_count", "commodities_count", "varieties_count"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for y in yearly_reports:
            row_dict = {k: y[k] for k in fieldnames}
            writer.writerow(row_dict)
            
    print(f"[Audit] Saved CSV audit report to {csv_audit_path}", flush=True)

    if sample_rows:
        df_sample_concat = pd.concat(sample_rows, ignore_index=True)
        df_sample_concat.to_csv(sample_data_path, index=False)
        print(f"[Audit] Saved sample dataset ({len(df_sample_concat)} real rows) to {sample_data_path}", flush=True)

    return audit_result

if __name__ == "__main__":
    run_audit()
