"""
DeBERTa-v3 Inference Engine (Model Version 4)
Supports granular Crime & Cybercrime Classification across 47 categories.
Loads fine-tuned DeBERTa-v3 model from ./inference/v4 and predicts category,
confidence score, crime domain (Physical vs Cyber), severity level, urgent dispatch flag,
and actionable citizen safety advisory.
"""

import os
import sys
import json
import torch
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModelForSequenceClassification

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

try:
    from ml_service.normalizer import normalize_and_translate
except ImportError:
    def normalize_and_translate(t): return (t, False)

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = CURRENT_DIR

# Comprehensive Rules for all 47 Categories in v4
CATEGORY_RULES = {
    "animal_cruelty_environmental": {
        "display_name": "Animal Cruelty & Environmental Crime",
        "domain": "Physical",
        "severity": "Medium",
        "is_urgent": False,
        "advisory": "Document evidence, vehicle numbers, and incident location. Report to local animal protection and wildlife authorities."
    },
    "arson_vandalism": {
        "display_name": "Arson & Vandalism",
        "domain": "Physical",
        "severity": "High",
        "is_urgent": True,
        "advisory": "URGENT: Call Fire Services (16) if active fire. Do not enter damaged premises until fire marshals declare it safe."
    },
    "assault_battery": {
        "display_name": "Assault & Physical Violence",
        "domain": "Physical",
        "severity": "Critical",
        "is_urgent": True,
        "advisory": "EMERGENCY: Seek immediate medical care and obtain a Medico-Legal Certificate (MLC). File an immediate police FIR."
    },
    "burglary": {
        "display_name": "Burglary & Break-in",
        "domain": "Physical",
        "severity": "High",
        "is_urgent": False,
        "advisory": "Do not touch door handles, windows, or crime scene surfaces until police forensic fingerprint teams inspect the premises."
    },
    "consumer_fraud_adulteration": {
        "display_name": "Consumer Fraud & Adulteration",
        "domain": "Physical",
        "severity": "Medium",
        "is_urgent": False,
        "advisory": "Preserve receipts, packaging, and product batch numbers. File a formal complaint with the Consumer Protection Court."
    },
    "cryptocurrency_crime": {
        "display_name": "Cryptocurrency Fraud",
        "domain": "Cyber",
        "severity": "Medium",
        "is_urgent": False,
        "advisory": "Record transaction hashes (TXID), scammer crypto wallet addresses, and communication logs for financial intelligence filing."
    },
    "cyberbullying_harassment": {
        "display_name": "Cyberbullying & Online Harassment",
        "domain": "Cyber",
        "severity": "High",
        "is_urgent": False,
        "advisory": "Take screenshots showing usernames, timestamps, and full URLs. Block the perpetrator and submit evidence to the Cyber Crime Wing."
    },
    "data_breach": {
        "display_name": "Corporate Data Breach",
        "domain": "Cyber",
        "severity": "Critical",
        "is_urgent": True,
        "advisory": "CRITICAL: Isolate compromised database servers immediately. Rotate administrative credentials and preserve firewall and access logs."
    },
    "domestic_violence_child_abuse": {
        "display_name": "Domestic Violence & Child Abuse",
        "domain": "Physical",
        "severity": "Critical",
        "is_urgent": True,
        "advisory": "EMERGENCY: Move to a safe location immediately. Call Women & Child Helpline (1099 / 15) for immediate protective intervention."
    },
    "drug_offences": {
        "display_name": "Narcotics & Drug Offences",
        "domain": "Physical",
        "severity": "High",
        "is_urgent": False,
        "advisory": "Report suspected drug distribution hotspots to the Anti-Narcotics Force (ANF) or local police intelligence unit."
    },
    "electoral_fraud": {
        "display_name": "Electoral Fraud & Malpractice",
        "domain": "Physical",
        "severity": "Medium",
        "is_urgent": False,
        "advisory": "Document polling station details, timestamps, and video/photo evidence. Report directly to the Election Commission."
    },
    "embezzlement_corruption": {
        "display_name": "Embezzlement & Corruption",
        "domain": "Physical",
        "severity": "High",
        "is_urgent": False,
        "advisory": "Preserve financial audit trails, ledger books, and bank transaction vouchers. File report with the Anti-Corruption Establishment."
    },
    "exam_cheating_academic_fraud": {
        "display_name": "Exam Cheating & Academic Fraud",
        "domain": "Physical",
        "severity": "Medium",
        "is_urgent": False,
        "advisory": "Report paper leakage, impersonation, or exam tampering to the Board of Education examination vigilance committee."
    },
    "extortion_blackmail": {
        "display_name": "Physical Extortion & Blackmail",
        "domain": "Physical",
        "severity": "Critical",
        "is_urgent": True,
        "advisory": "CRITICAL: Do not pay extortion/bhatta. Contact the Anti-Violent Crime Cell (AVCC) or Special Investigation Unit immediately."
    },
    "financial_fraud_forgery": {
        "display_name": "Financial Fraud & Document Forgery",
        "domain": "Physical",
        "severity": "High",
        "is_urgent": False,
        "advisory": "Preserve original forged documents, counterfeit stamps, and bank statements for forensic handwriting verification."
    },
    "hate_crime": {
        "display_name": "Hate Crime & Incitement",
        "domain": "Physical",
        "severity": "Critical",
        "is_urgent": True,
        "advisory": "EMERGENCY: Contact police helpline (15) immediately. Preserve video, audio, or pamphlet evidence inciting violence."
    },
    "homicide": {
        "display_name": "Homicide & Murder Investigation",
        "domain": "Physical",
        "severity": "Critical",
        "is_urgent": True,
        "advisory": "EMERGENCY: Immediate police and forensic response required. Cordon off the entire scene and do not disturb any evidence."
    },
    "honour_crimes_forced_marriage": {
        "display_name": "Honour Crime & Forced Marriage",
        "domain": "Physical",
        "severity": "Critical",
        "is_urgent": True,
        "advisory": "EMERGENCY: Immediate life threat. Seek shelter at Dar-ul-Aman or call human rights emergency response hotline (1099)."
    },
    "human_trafficking": {
        "display_name": "Human Trafficking & Smuggling",
        "domain": "Physical",
        "severity": "Critical",
        "is_urgent": True,
        "advisory": "CRITICAL: Report suspect recruiters, unauthorized visa agencies, and transit locations to the Federal Investigation Agency (FIA)."
    },
    "identity_theft": {
        "display_name": "Identity Theft & Impersonation",
        "domain": "Cyber",
        "severity": "High",
        "is_urgent": True,
        "advisory": "Alert your contacts not to send funds. Report imposter account on platform and notify NADRA / relevant national identity registry."
    },
    "illegal_gambling": {
        "display_name": "Illegal Gambling & Betting",
        "domain": "Cyber",
        "severity": "Medium",
        "is_urgent": False,
        "advisory": "Report illegal betting URLs, payment intermediary accounts, and promoter contact numbers to the cyber regulator."
    },
    "insider_threat_trade_secret_theft": {
        "display_name": "Insider Threat & IP Theft",
        "domain": "Cyber",
        "severity": "High",
        "is_urgent": False,
        "advisory": "Revoke employee VPN, email, and repository access immediately. Freeze audit logs and secure external drive history."
    },
    "intellectual_property_piracy": {
        "display_name": "Intellectual Property Piracy",
        "domain": "Cyber",
        "severity": "Medium",
        "is_urgent": False,
        "advisory": "File DMCA takedown notice with hosting provider and registrar. Submit copyright registration proof to the cyber crime wing."
    },
    "kidnapping": {
        "display_name": "Kidnapping & Abduction",
        "domain": "Physical",
        "severity": "Critical",
        "is_urgent": True,
        "advisory": "EMERGENCY: Call Anti-Violent Crime Cell (AVCC) & Police Helpline (15) immediately. Preserve all call logs and ransom messages."
    },
    "medical_fraud_malpractice": {
        "display_name": "Medical Fraud & Quackery",
        "domain": "Physical",
        "severity": "High",
        "is_urgent": False,
        "advisory": "Retain prescriptions, medical records, and pharmacy receipts. File a formal complaint with the Healthcare Commission."
    },
    "mob_violence_lynching": {
        "display_name": "Mob Violence & Public Lynching",
        "domain": "Physical",
        "severity": "Critical",
        "is_urgent": True,
        "advisory": "EMERGENCY: Severe imminent danger. Contact Emergency Police Control (15) for immediate armed riot response."
    },
    "motor_vehicle_theft": {
        "display_name": "Motor Vehicle Theft",
        "domain": "Physical",
        "severity": "High",
        "is_urgent": True,
        "advisory": "URGENT: Report immediately to the Anti-Car Lifting Cell (ACLC) and local police station with registration, chassis, and engine numbers."
    },
    "non_crime": {
        "display_name": "Non-Criminal Civil Dispute",
        "domain": "Physical",
        "severity": "Medium",
        "is_urgent": False,
        "advisory": "This matter appears to be a civil/contractual issue rather than a criminal offence. Consult legal counsel for civil court mediation."
    },
    "online_banking_fraud": {
        "display_name": "Online Banking & OTP Fraud",
        "domain": "Cyber",
        "severity": "High",
        "is_urgent": True,
        "advisory": "URGENT: Call your bank helpline immediately to freeze your account, block compromised ATM cards, and recall unauthorized transfers."
    },
    "online_extortion_sextortion": {
        "display_name": "Online Sextortion & Blackmail",
        "domain": "Cyber",
        "severity": "Critical",
        "is_urgent": True,
        "advisory": "CRITICAL: Do not pay money or send additional media. Preserve all chat screenshots and report directly to the Cyber Crime Helpline (1991)."
    },
    "online_scam_fraud": {
        "display_name": "Online Shopping & Investment Scam",
        "domain": "Cyber",
        "severity": "High",
        "is_urgent": True,
        "advisory": "File a dispute with your payment provider or digital wallet. Retain transaction slips, seller web links, and chat records."
    },
    "organized_crime_gang": {
        "display_name": "Organized Crime & Gang Activity",
        "domain": "Physical",
        "severity": "Critical",
        "is_urgent": True,
        "advisory": "CRITICAL: Do not attempt to confront suspects. Report intelligence to the Counter-Terrorism Department (CTD) or Special Branch."
    },
    "other_crime": {
        "display_name": "General Offence (Other)",
        "domain": "Physical",
        "severity": "Medium",
        "is_urgent": False,
        "advisory": "Provide detailed chronological narrative and witnesses to your nearest police station for formal FIR registration."
    },
    "perjury_obstruction_of_justice": {
        "display_name": "Perjury & Obstruction of Justice",
        "domain": "Physical",
        "severity": "Medium",
        "is_urgent": False,
        "advisory": "Submit documentation demonstrating false statements or destroyed evidence to the presiding court magistrate."
    },
    "phishing_smishing": {
        "display_name": "Phishing & Fake SMS (Smishing)",
        "domain": "Cyber",
        "severity": "High",
        "is_urgent": True,
        "advisory": "Never click SMS links requesting passwords or PINs. Forward fraudulent sender numbers to PTA (9999) for immediate blocking."
    },
    "public_disorder_weapons": {
        "display_name": "Public Disorder & Illegal Weapons",
        "domain": "Physical",
        "severity": "Critical",
        "is_urgent": True,
        "advisory": "EMERGENCY: Active public threat. Call Police Emergency (15) immediately for rapid armed patrol dispatch."
    },
    "ransomware_malware": {
        "display_name": "Ransomware & Malware Outbreak",
        "domain": "Cyber",
        "severity": "Critical",
        "is_urgent": True,
        "advisory": "CRITICAL: Disconnect affected computers from local network immediately. Do not pay ransom; preserve encrypted file extensions."
    },
    "robbery": {
        "display_name": "Robbery & Armed Snatching",
        "domain": "Physical",
        "severity": "Critical",
        "is_urgent": True,
        "advisory": "EMERGENCY: Immediate armed threat. Call Police Helpline (15) immediately for rapid area cordon and search."
    },
    "sexual_assault": {
        "display_name": "Sexual Assault & Rape",
        "domain": "Physical",
        "severity": "Critical",
        "is_urgent": True,
        "advisory": "EMERGENCY: Seek immediate hospital care for medico-legal examination. Contact the Anti-Rape Crisis Cell or Helpline (1099)."
    },
    "sexual_harassment": {
        "display_name": "Physical Sexual Harassment",
        "domain": "Physical",
        "severity": "High",
        "is_urgent": False,
        "advisory": "Report harasser identity, workplace, or transit details to the Workplace Harassment Ombudsperson or local police station."
    },
    "smuggling_contraband": {
        "display_name": "Smuggling & Contraband",
        "domain": "Physical",
        "severity": "High",
        "is_urgent": False,
        "advisory": "Report illegal border crossing, non-custom-paid vehicles, or prohibited goods to Customs Intelligence."
    },
    "terrorism_extremism": {
        "display_name": "Terrorism & Extremist Threat",
        "domain": "Physical",
        "severity": "Critical",
        "is_urgent": True,
        "advisory": "EMERGENCY: Imminent national security threat. Call National Counter Terrorism Helpline (1717) immediately."
    },
    "theft": {
        "display_name": "Theft & Pickpocketing",
        "domain": "Physical",
        "severity": "Medium",
        "is_urgent": False,
        "advisory": "Obtain CCTV footage from nearby merchants if available. File a property loss report at your local police station."
    },
    "threats_stalking": {
        "display_name": "Threats of Violence & Stalking",
        "domain": "Physical",
        "severity": "High",
        "is_urgent": True,
        "advisory": "Record all incoming call audio, letters, and suspicious vehicles. Request a protective restraining order from the magistrate."
    },
    "traffic_offence": {
        "display_name": "Reckless Driving & Traffic Offence",
        "domain": "Physical",
        "severity": "Medium",
        "is_urgent": False,
        "advisory": "Record vehicle registration plate number and camera footage. Submit report to Traffic Police Control."
    },
    "trespass_land_grab": {
        "display_name": "Illegal Trespass & Land Grabbing",
        "domain": "Physical",
        "severity": "High",
        "is_urgent": False,
        "advisory": "Gather registered title deeds, mutation records, and survey maps. File an anti-qabza complaint with the Deputy Commissioner."
    },
    "unauthorized_access_hacking": {
        "display_name": "Unauthorized Access & System Hacking",
        "domain": "Cyber",
        "severity": "Critical",
        "is_urgent": True,
        "advisory": "CRITICAL: Revoke all compromised session tokens. Change root passwords, enable hardware 2FA, and preserve server auth logs."
    }
}

print(f"Loading DeBERTa-v3 v4 model from: {MODEL_DIR}")
try:
    tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_DIR)
    model.eval()
    print("DeBERTa-v3 v4 model loaded successfully!")
except Exception as e:
    print(f"Error loading DeBERTa-v3 v4 model: {e}")
    raise e


def predict_crime(text: str, auto_translate: bool = True) -> dict:
    """
    Classifies a citizen crime complaint narrative using DeBERTa-v3 v4.
    Optionally normalizes and translates Roman Urdu/colloquial text via Gemini API.
    
    Args:
        text (str): Raw citizen complaint text
        auto_translate (bool): Whether to use Gemini to translate/normalize text
        
    Returns:
        dict: Standardized prediction schema including category, confidence,
              domain, severity, urgent dispatch flag, safety advisory, and top-3 candidates.
    """
    if not text or len(text.strip()) == 0:
        return {
            "original_text": text,
            "normalized_text": text,
            "is_translated": False,
            "predicted_category": "non_crime",
            "display_name": "Non-Criminal Matter",
            "domain": "Physical",
            "confidence": 0.0,
            "severity": "Medium",
            "is_urgent": False,
            "advisory": "Complaint narrative is empty.",
            "top_candidates": []
        }

    raw_text = text.strip()
    clean_text = raw_text
    is_translated = False

    # 1. Translate / normalize if enabled and Gemini API is active
    if auto_translate:
        clean_text, is_translated = normalize_and_translate(raw_text)

    # 2. Tokenize normalized text (DeBERTa max_length 256 for rich narrative context)
    inputs = tokenizer(
        clean_text,
        return_tensors="pt",
        truncation=True,
        max_length=256,
        padding=True
    ).to(model.device)

    # DeBERTa models do not use token_type_ids
    inputs.pop("token_type_ids", None)

    with torch.no_grad():
        outputs = model(**inputs)
        probs = F.softmax(outputs.logits, dim=-1)[0]
        
        # Top-3 predictions
        top_k = min(3, len(probs))
        top_probs, top_indices = torch.topk(probs, top_k)
        
        raw_pred_idx = top_indices[0].item()
        raw_category = model.config.id2label.get(raw_pred_idx, str(raw_pred_idx))
        confidence = round(top_probs[0].item() * 100, 2)

        # Build top candidates list
        top_candidates = []
        for p, idx in zip(top_probs, top_indices):
            cat_name = model.config.id2label.get(idx.item(), str(idx.item()))
            rule = CATEGORY_RULES.get(cat_name, {})
            disp = rule.get("display_name", cat_name.replace("_", " ").title())
            top_candidates.append({
                "category": disp,
                "raw_category": cat_name,
                "confidence": round(p.item() * 100, 2)
            })

    # Retrieve mapped business rules
    rule = CATEGORY_RULES.get(raw_category, {
        "display_name": raw_category.replace("_", " ").title(),
        "domain": "Cyber" if "cyber" in raw_category or "online" in raw_category else "Physical",
        "severity": "High",
        "is_urgent": False,
        "advisory": "Report incident to local law enforcement with all available evidence."
    })

    return {
        "original_text": raw_text,
        "normalized_text": clean_text,
        "is_translated": is_translated,
        "predicted_category": rule["display_name"],
        "raw_category": raw_category,
        "domain": rule["domain"],
        "confidence": confidence,
        "severity": rule["severity"],
        "is_urgent": rule["is_urgent"],
        "advisory": rule["advisory"],
        "top_candidates": top_candidates
    }


if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("      DEBERTA-V3 (MODEL V4) INFERENCE & TEST HARNESS")
    print("=" * 70)

    test_queries = [
        "Two masked men intercepted me on a motorbike with a gun and snatched my wallet and iPhone 15.",
        "Our hospital server was hit by malware and all medical files are locked with .encrypted extension demanding 5 Bitcoin.",
        "Received a fraudulent SMS claiming my bank account is suspended, clicked the link and Rs. 95,000 was transferred out via Raast.",
        "Returned home after work to find the front door lock broken and gold jewelry missing from our bedroom safe.",
        "Someone created an imposter Facebook profile with my sister's photos and is sending defamatory abusive messages to her friends.",
        "A group of men attacked my brother with iron rods outside his shop causing severe fractures.",
        "Invested 2,000 USDT in a fake Telegram crypto mining platform and now the administrator blocked me.",
        "An anonymous caller has been threatening to kidnap my children if I don't pay 500,000 PKR protection money."
    ]

    for i, q in enumerate(test_queries, 1):
        res = predict_crime(q)
        print(f"\n[Test {i}] \"{q}\"")
        print(f"  -> Category   : {res['predicted_category']} ({res['raw_category']})")
        print(f"  -> Domain     : {res['domain']}")
        print(f"  -> Confidence : {res['confidence']}%")
        print(f"  -> Severity   : {res['severity']} | Urgent: {res['is_urgent']}")
        top_str = ", ".join([f"{c['category']} ({c['confidence']}%)" for c in res['top_candidates']])
        print(f"  -> Top 3      : {top_str}")
