# Crime Report Dataset Documentation

## 1. Overview & Context

This document details the architecture, methodology, and generation process of the benchmark dataset **`data/crime_reports_dataset.csv`** used in the **Crime Report Classification and Analysis System**.

### The Core Dataset Problem
Public municipal police datasets (such as Chicago Data Portal or LAPD Open Data) record crime codes, dates, and coordinates, but **lack unstructured free-text narratives written by citizens**. Conversely, raw NLP text datasets often lack spatial coordinates and severity metadata.

To satisfy all requirements of this project—**NLP Text Classification**, **Severity Prioritization**, **Interactive Map Hotspots**, and **Time-Series Analytics**—we engineered a **Curated Multi-Source Benchmark Dataset**.

---

## 2. Data Sources & References

The dataset integrates two foundational sources:

1. **Hugging Face (`Dev523/Crime-Reports-Dataset`)**:
   - **Content:** ~125,000 real-world citizen complaints and incident narratives.
   - **Extracted Domains:** Online Financial Fraud, Phishing, Identity Theft, Cyber Bullying, Stalking, and Harassment.
   - **Primary Column Used:** `crimeaditionalinfo` (raw complainant text).

2. **Municipal Police Incident Standard Taxonomy (SF / Chicago / LAPD Open Data Standards)**:
   - **Content:** Structured narrative patterns for physical and violent crimes (Robbery, Assault, Burglary, Vehicle Theft, Vandalism, Larceny).
   - **Augmentation:** Multi-attribute sentence variation including weapon indicators, time-of-day prefixes, victim phrasing, and urgency suffixes.

---

## 3. Dataset Schema

The generated dataset contains **3,200 balanced records** structured across 8 essential attributes:

| Column Name | Data Type | Description | Application Purpose |
| :--- | :--- | :--- | :--- |
| `report_id` | `String` | Unique alphanumeric identifier (e.g. `CR-2026-0042`) | Tracking reference for citizens and police officers |
| `description` | `String` | Free-text narrative describing the incident | **Feature ($X$)** for NLP Classifier |
| `category` | `String` | Ground truth crime classification label | **Target ($y$)** for NLP Classifier |
| `severity` | `String` | Incident priority level (`High`, `Medium`, `Low`) | Priority Triage Queue for emergency handling |
| `latitude` | `Float` | GPS Latitude coordinate (e.g. `31.520412`) | Leaflet.js Map pin & heatmap hotspot calculation |
| `longitude` | `Float` | GPS Longitude coordinate (e.g. `74.358745`) | Leaflet.js Map pin & heatmap hotspot calculation |
| `location_name` | `String` | Human-readable neighborhood or commercial zone | Area-wise incident aggregation & reports |
| `timestamp` | `DateTime` | Incident occurrence timestamp (`YYYY-MM-DD HH:MM:SS`) | Hourly, daily, and monthly trend charts |
| `status` | `String` | Verification status (`Verified` / `Pending Review`) | Admin workflow lifecycle state |

---

## 4. Crime Taxonomy & Severity Engine

The dataset is partitioned into **8 balanced classes** (400 samples each):

```
┌─────────────────┬───────────┬─────────────────────────────────────────────────────────────┐
│ Category        │ Severity  │ Domain Rationale & Description                              │
├─────────────────┼───────────┼─────────────────────────────────────────────────────────────┤
│ Robbery         │ High      │ Threat of force, firearm/knife use, street mugging          │
│ Assault         │ High      │ Physical violence, bodily harm, physical altercations       │
│ Burglary        │ Medium    │ Unlawful forced entry into homes, shops, or warehouses      │
│ Vehicle Theft   │ Medium    │ Stolen automobiles, motorcycles, or transit equipment       │
│ Harassment      │ Medium    │ Stalking, persistent verbal threats, intimidating behavior  │
│ Theft           │ Low       │ Non-violent stealing, pickpocketing, unattended property    │
│ Vandalism       │ Low       │ Intentional property damage, broken windows, graffiti       │
│ Fraud           │ Low       │ Non-violent scams, phishing, unauthorized bank debits       │
└─────────────────┴───────────┴─────────────────────────────────────────────────────────────┘
```

---

## 5. Step-by-Step Generation Pipeline

The generation process is fully automated via `scripts/prepare_dataset.py`:

```
┌────────────────────────────────────────────────────────┐
│ 1. Ingest Real Hugging Face Citizen Complaints         │
│    (Filters 'crimeaditionalinfo' for Fraud/Harassment) │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│ 2. Synthesize Physical & Street Crime Narratives       │
│    (Apply linguistic variations, weapons, locations)   │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│ 3. Geo-Spatial Coordinate Assignment                   │
│    (15 urban centers with ±0.015° natural jitter)      │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│ 4. Temporal Distribution Synthesis                     │
│    (Distributed over past 90 days across 24 hours)     │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│ 5. Class Balancing & Validation Export                 │
│    (Generates data/crime_reports_dataset.csv)          │
└────────────────────────────────────────────────────────┘
```

### A. Linguistic Diversity & Data Augmentation
To ensure the NLP model generalizes well to everyday citizen phrasing, the generator combines:
- **Temporal Prefixes:** *"Yesterday around 9 PM"*, *"Last night at approximately 2:30 AM"*, *"This morning on my way to work"*, *"During afternoon rush hour"*.
- **Weapon & Force Indicators:** *"at gunpoint"*, *"held a knife"*, *"threatened with an iron rod"*, *"unarmed grab"*.
- **Target Assets:** *"iPhone"*, *"wallet"*, *"Honda motorcycle"*, *"safe box"*, *"jewelry"*, *"laptop bag"*.
- **Urgency Suffixes:** *"Please dispatch a patrol car"*, *"I have security camera footage available"*, *"Need urgent assistance"*.

### B. Geo-Spatial Distribution
Coordinates are anchored around **15 realistic urban zones** with a gaussian jitter ($\pm 0.015^\circ$) applied to prevent direct point overlap and simulate realistic city-wide crime clustering.

### C. Temporal Distribution
Timestamps are synthetically generated across a 90-day historical window covering day, evening, and late-night hours, matching real-world crime occurrence patterns (e.g. late-night burglaries, evening street robberies).

---

## 6. How to Re-generate the Dataset

To regenerate or customize the dataset:

```bash
python scripts/prepare_dataset.py
```

The script will fetch the Hugging Face slice, compile the balanced dataset, and write the output to `data/crime_reports_dataset.csv`.

