"""
DistilBERT Inference Engine (Model Version 2)
Loads the fine-tuned DistilBERT model from ./inference/v2 and predicts the cybercrime category,
confidence score, top-3 candidates, severity level, and safety advisory for any citizen complaint text.
"""

import os
import sys
import json
import torch
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModelForSequenceClassification

# Path to the v2 model directory
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(CURRENT_DIR, "v2")

# Category severity and automated citizen advisory rules
CATEGORY_RULES = {
    "Online Financial Fraud": {
        "severity": "High",
        "is_urgent": True,
        "advisory": "URGENT: Immediately contact your bank helpline (15 / 1991) to block your card and request a transaction freeze."
    },
    "Cyber Attack/ Dependent Crimes": {
        "severity": "High",
        "is_urgent": True,
        "advisory": "URGENT: Disconnect affected devices from the internet, isolate local network systems, and preserve log files."
    },
    "Ransomware": {
        "severity": "High",
        "is_urgent": True,
        "advisory": "URGENT: Do not pay ransom demands. Isolate infected machines immediately to stop lateral network propagation."
    },
    "Sexually Explicit Act": {
        "severity": "High",
        "is_urgent": True,
        "advisory": "HIGH PRIORITY: Do not yield to blackmail or extortion demands. Preserve screenshots/chat logs and seek immediate cyber cell protection."
    },
    "RapeGang Rape RGRSexually Abusive Content": {
        "severity": "High",
        "is_urgent": True,
        "advisory": "HIGH PRIORITY: Preserve digital evidence (URLs, usernames). Contact cyber authorities immediately for protective action."
    },
    "Child Pornography CPChild Sexual Abuse Material CSAM": {
        "severity": "High",
        "is_urgent": True,
        "advisory": "CRITICAL: Immediate escalation to special cyber investigation authorities for child safety protection."
    },
    "Cyber Terrorism": {
        "severity": "High",
        "is_urgent": True,
        "advisory": "CRITICAL: Severe threat detected. Escalated for priority law enforcement investigation."
    },
    "Online Cyber Trafficking": {
        "severity": "High",
        "is_urgent": True,
        "advisory": "HIGH PRIORITY: Verify legitimate employment/visa agencies. Preserve all wire transfer details for investigation."
    },
    "Online and Social Media Related Crime": {
        "severity": "Medium",
        "is_urgent": False,
        "advisory": "Report the offending user/profile directly to the platform (WhatsApp/Instagram) and enable Two-Factor Authentication (2FA)."
    },
    "Hacking  Damage to computercomputer system etc": {
        "severity": "Medium",
        "is_urgent": False,
        "advisory": "Reset all account credentials and recovery emails immediately. Log out of all active remote sessions."
    },
    "Cryptocurrency Crime": {
        "severity": "Medium",
        "is_urgent": False,
        "advisory": "Record recipient wallet addresses, exchange names, and transaction hashes for blockchain tracing."
    },
    "Any Other Cyber Crime": {
        "severity": "Medium",
        "is_urgent": False,
        "advisory": "Your report has been logged and assigned to a cyber crime investigative officer."
    },
    "Sexually Obscene material": {
        "severity": "Medium",
        "is_urgent": False,
        "advisory": "Block the sender and report unconsented media to platform safety teams."
    },
    "Online Gambling  Betting": {
        "severity": "Low",
        "is_urgent": False,
        "advisory": "Illegal gaming/betting apps pose severe identity risks. Report domain for ISP regulatory blocking."
    }
}

DEFAULT_RULE = {
    "severity": "Medium",
    "is_urgent": False,
    "advisory": "Report logged and queued for cyber crime triage."
}


class DistilBertPredictor:
    def __init__(self, model_path=MODEL_DIR):
        print(f"Loading DistilBERT Tokenizer & Model from: {model_path}...")
        self.tokenizer = AutoTokenizer.from_pretrained(model_path)
        self.model = AutoModelForSequenceClassification.from_pretrained(model_path)
        self.model.eval()  # Set evaluation mode for fast CPU inference
        print("Model loaded successfully and ready for inference!\n")

    def predict(self, text: str) -> dict:
        """Runs inference on a given input complaint text."""
        if not text or not text.strip():
            return {
                "error": "Empty input text provided",
                "predicted_category": "Unknown",
                "confidence": 0.0
            }

        # Tokenize input
        inputs = self.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=128
        )
        inputs.pop("token_type_ids", None)
        # Forward pass without gradients
        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits
            probabilities = F.softmax(logits, dim=-1)[0]

        # Top prediction
        predicted_id = torch.argmax(probabilities).item()
        confidence = probabilities[predicted_id].item() * 100
        predicted_category = self.model.config.id2label[predicted_id]

        # Top-3 predictions
        top3_prob, top3_indices = torch.topk(probabilities, k=min(3, len(probabilities)))
        top_3 = [
            {
                "category": self.model.config.id2label[idx.item()],
                "confidence": round(prob.item() * 100, 2)
            }
            for prob, idx in zip(top3_prob, top3_indices)
        ]

        # Severity & Safety Advisory
        rule = CATEGORY_RULES.get(predicted_category, DEFAULT_RULE)
        requires_review = confidence < 65.0

        return {
            "input_text": text,
            "predicted_category": predicted_category,
            "confidence_score": round(confidence, 2),
            "severity": rule["severity"],
            "is_urgent": rule["is_urgent"],
            "requires_human_review": requires_review,
            "safety_advisory": rule["advisory"],
            "top_3_predictions": top_3
        }


# Singleton instance
_instance = None

def get_predictor():
    global _instance
    if _instance is None:
        _instance = DistilBertPredictor()
    return _instance


if __name__ == "__main__":
    predictor = get_predictor()

    # If text is provided via command-line arguments:
    # e.g., python inference/predict_v2.py "Someone called asking for OTP"
    if len(sys.argv) > 1:
        query_text = " ".join(sys.argv[1:])
        result = predictor.predict(query_text)
        print(json.dumps(result, indent=2))
    else:
        # Run demo test cases
        print("=" * 70)
        print("               RUNNING SAMPLE CYBERCRIME INFERENCE TESTS               ")
        print("=" * 70)

        sample_cases = [
            "A caller claiming to be bank manager asked for OTP and debited 75,000 rupees from my account.",
            "Someone created a fake Instagram profile with my photos and is sending abusive messages to my relatives.",
            "Our company office server got locked and encrypted with a message demanding 2 Bitcoins to unlock files.",
            "An agent offered a work from home job but demanded 50,000 registration fee and then blocked my phone number."
        ]

        for i, sample in enumerate(sample_cases, 1):
            res = predictor.predict(sample)
            print(f"\n[Test Case #{i}]")
            print(f"Input Text         : \"{res['input_text']}\"")
            print(f"Predicted Category : {res['predicted_category']}")
            print(f"Confidence Score   : {res['confidence_score']}%")
            print(f"Severity / Urgency : {res['severity']} (Urgent: {res['is_urgent']})")
            print(f"Safety Advisory    : {res['safety_advisory']}")
            print("Top 3 Candidates   :")
            for rank, item in enumerate(res['top_3_predictions'], 1):
                print(f"   {rank}. {item['category']} ({item['confidence']}%)")
            print("-" * 70)
