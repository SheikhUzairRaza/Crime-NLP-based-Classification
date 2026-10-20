"""
DistilBERT Inference Engine (Model Version 3)
Supports unified Cyber & Physical Crime Classification across 11 clean categories.
Loads fine-tuned DistilBERT model from ./inference/v3 and predicts category,
confidence score, crime domain, severity level, urgent dispatch flag, and actionable citizen advisory.
"""

import os
import sys
import json
import torch
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModelForSequenceClassification

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if os.path.exists(os.path.join(CURRENT_DIR, "config.json")):
    MODEL_DIR = CURRENT_DIR
else:
    MODEL_DIR = os.path.join(CURRENT_DIR, "v3")

# Comprehensive v3 Severity, Domain, and Citizen Advisory Rules
CATEGORY_RULES = {
    "Robbery & Armed Snatching": {
        "domain": "Physical",
        "severity": "Critical",
        "is_urgent": True,
        "advisory": "EMERGENCY: Immediate armed threat. Call Emergency Police Helpline (15) immediately for rapid patrol response."
    },
    "Assault & Physical Violence": {
        "domain": "Physical",
        "severity": "Critical",
        "is_urgent": True,
        "advisory": "EMERGENCY: Seek immediate medical care and obtain a Medico-Legal Certificate (MLC). File an immediate FIR."
    },
    "Physical Extortion & Blackmail": {
        "domain": "Physical",
        "severity": "Critical",
        "is_urgent": True,
        "advisory": "CRITICAL: Do not confront extortionists or pay ransom. Contact the Anti-Violent Crime Cell (AVCC) immediately."
    },
    "Hacking & Unauthorized Access": {
        "domain": "Cyber",
        "severity": "Critical",
        "is_urgent": True,
        "advisory": "CRITICAL: Disconnect affected machines from network. Isolate database servers and preserve system security logs."
    },
    "Ransomware & Digital Extortion": {
        "domain": "Cyber",
        "severity": "Critical",
        "is_urgent": True,
        "advisory": "CRITICAL: Do not pay ransom. Disconnect local network and backup drives immediately to halt encryption spread."
    },
    "Financial Fraud": {
        "domain": "Cyber",
        "severity": "High",
        "is_urgent": True,
        "advisory": "URGENT: Call your bank helpline immediately (15 / 1991) to freeze your account and initiate fraud transaction reversal."
    },
    "Identity Theft & Impersonation": {
        "domain": "Cyber",
        "severity": "High",
        "is_urgent": True,
        "advisory": "HIGH PRIORITY: Alert contacts not to send funds. Report imposter account on platform and initiate recovery via official support."
    },
    "Cyber Harassment & Stalking": {
        "domain": "Cyber",
        "severity": "High",
        "is_urgent": False,
        "advisory": "HIGH PRIORITY: Preserve screenshots, profile links, and message timestamps. Submit report to National Cyber Crime Reporting Portal."
    },
    "Burglary & Break-in": {
        "domain": "Physical",
        "severity": "High",
        "is_urgent": False,
        "advisory": "HIGH PRIORITY: Do not enter or touch scene surfaces until police forensic fingerprint teams inspect the premises."
    },
    "Physical Harassment & Stalking": {
        "domain": "Physical",
        "severity": "High",
        "is_urgent": False,
        "advisory": "HIGH PRIORITY: Avoid travelling alone on isolated routes. Report vehicle and suspect details to your local police station."
    },
    "Cryptocurrency Fraud": {
        "domain": "Cyber",
        "severity": "Medium",
        "is_urgent": False,
        "advisory": "MEDIUM: Record transaction hashes (TXID) and scammer crypto wallet addresses for financial intelligence filing."
    }
}

print(f"Loading DistilBERT v3 model from: {MODEL_DIR}")
try:
    tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_DIR)
    model.eval()
    print("DistilBERT v3 model loaded successfully!")
except Exception as e:
    print(f"[ERROR] Failed to load v3 model: {e}")
    sys.exit(1)


def predict_crime(text: str, top_k: int = 3) -> dict:
    """
    Predicts the crime category for a given text description using Model v3.
    """
    if not text or not text.strip():
        return {
            "error": "Input text cannot be empty",
            "predicted_category": None,
            "confidence": 0.0
        }

    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=128,
        padding=True
    )
    # Remove token_type_ids since DistilBERT does not support them
    inputs.pop("token_type_ids", None)

    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
        probabilities = F.softmax(logits, dim=-1)[0]

    # Top prediction
    predicted_id = torch.argmax(probabilities).item()
    predicted_category = model.config.id2label[predicted_id]
    confidence = float(probabilities[predicted_id].item())

    # Top-K candidates
    top_probs, top_indices = torch.topk(probabilities, k=min(top_k, len(probabilities)))
    top_candidates = []
    for prob, idx in zip(top_probs, top_indices):
        cat_name = model.config.id2label[idx.item()]
        top_candidates.append({
            "category": cat_name,
            "confidence": round(float(prob.item()) * 100, 2)
        })

    # Metadata rules lookup
    rules = CATEGORY_RULES.get(predicted_category, {
        "domain": "Unknown",
        "severity": "Medium",
        "is_urgent": False,
        "advisory": "File a report with your local police station or relevant regulatory authority."
    })

    return {
        "model_version": "v3",
        "predicted_category": predicted_category,
        "domain": rules["domain"],
        "confidence": round(confidence * 100, 2),
        "severity": rules["severity"],
        "is_urgent": rules["is_urgent"],
        "advisory": rules["advisory"],
        "top_candidates": top_candidates
    }


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="DistilBERT v3 Crime Inference Engine")
    parser.add_argument("--text", type=str, help="Single crime complaint text to predict")
    parser.add_argument("--benchmark", action="store_true", help="Run the benchmark test suite")
    args = parser.parse_args()

    if args.text:
        result = predict_crime(args.text)
        print(json.dumps(result, indent=2))
        sys.exit(0)

    if args.benchmark:
        test_cases = [
            "Two masked men intercepted me with a pistol near the metro station and snatched my iPhone and 25,000 cash.",
            "A group of thugs attacked my younger brother outside our shop with iron rods and beat him mercilessly.",
            "A suspicious man in a car has been persistently following my sister every evening on her walk back from college.",
            "Local goons sent an envelope containing a bullet and demanding 500,000 PKR monthly bhatta protection money.",
            "Bank helpline k naam se call ayi unhon ne OTP manga aur account se 70,000 rupay nikal gaye.",
            "Someone created a fake profile with my pictures on Instagram and is messaging my friends asking for money.",
            "All computers in our office are showing a black screen with .locked files and hacker is demanding 2 Bitcoin ransom.",
            "Joined a Telegram VIP trading group promising 300% profit, transferred 1000 USDT and now admin blocked me."
        ]

        print("\n" + "=" * 80)
        print("        RUNNING INFERENCE v3 BENCHMARK")
        print("=" * 80)
        for i, statement in enumerate(test_cases, 1):
            res = predict_crime(statement)
            print(f"\n[Case #{i}] \"{statement}\"")
            print(f"-> {res['predicted_category']} ({res['confidence']}%) | {res['domain']} | {res['severity']}")
        sys.exit(0)

    # Default: Interactive Live Chat Mode
    print("\n" + "=" * 70)
    print(" CRIME & CYBERCRIME NLP CLASSIFIER (v3 INTERACTIVE MODE)")
    print(" Type any crime sentence below to test the model.")
    print(" (Type 'exit' or 'q' to stop)")
    print("=" * 70 + "\n")

    while True:
        try:
            user_input = input("\nEnter Complaint Text: ").strip()
            if not user_input:
                continue
            if user_input.lower() in ["q", "exit", "quit"]:
                print("Exiting classifier. Goodbye!")
                break

            result = predict_crime(user_input)
            print("-" * 50)
            print(f"Predicted Category : [{result['predicted_category']}]")
            print(f"Crime Domain       : {result['domain']}")
            print(f"Confidence Score   : {result['confidence']}%")
            print(f"Severity Level     : {result['severity']} (Urgent: {result['is_urgent']})")
            print(f"Top 3 Candidates   : {result['top_candidates']}")
            print(f"Citizen Advisory   : {result['advisory']}")
            print("-" * 50)
        except (KeyboardInterrupt, EOFError):
            print("\nExiting.")
            break

