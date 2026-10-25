import os
import sys
from typing import Optional, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from inference.v4.predict_v4 import predict_crime, CATEGORY_RULES

app = FastAPI(
    title="Crime & Cybercrime NLP Classification Microservice (v4)",
    description="Fine-tuned DeBERTa-v3 inference engine for Cyber & Physical Crime Triage across 47 categories",
    version="4.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PredictionRequest(BaseModel):
    text: str = Field(..., min_length=3, description="Citizen crime complaint narrative")


class CandidatePrediction(BaseModel):
    category: str
    raw_category: Optional[str] = None
    confidence: float


class PredictionResponse(BaseModel):
    success: bool
    input_text: str
    normalized_text: Optional[str] = None
    is_translated: bool = False
    predicted_category: str
    raw_category: str
    domain: str
    confidence_score: float
    severity: str
    is_urgent: bool
    safety_advisory: str
    top_candidates: List[CandidatePrediction]


@app.get("/health")
def health_check():
    return {
        "status": "online",
        "service": "crime-nlp-engine-v4",
        "model_architecture": "DeBERTa-v3 (microsoft/deberta-v3-base)",
        "model_version": "v4",
        "categories_supported": len(CATEGORY_RULES),
        "domains": ["Cyber", "Physical"]
    }


@app.get("/categories")
def list_categories():
    return {
        "total_categories": len(CATEGORY_RULES),
        "categories": [
            {
                "key": k,
                "display_name": v["display_name"],
                "domain": v["domain"],
                "severity": v["severity"],
                "is_urgent": v["is_urgent"]
            }
            for k, v in CATEGORY_RULES.items()
        ]
    }


@app.post("/predict", response_model=PredictionResponse)
def classify_complaint(payload: PredictionRequest):
    try:
        res = predict_crime(payload.text)
        return {
            "success": True,
            "input_text": res.get("original_text", payload.text),
            "normalized_text": res.get("normalized_text", payload.text),
            "is_translated": res.get("is_translated", False),
            "predicted_category": res["predicted_category"],
            "raw_category": res["raw_category"],
            "domain": res["domain"],
            "confidence_score": res["confidence"],
            "severity": res["severity"],
            "is_urgent": res["is_urgent"],
            "safety_advisory": res["advisory"],
            "top_candidates": res["top_candidates"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    print("Starting Crime NLP Microservice v4 on port 8000...")
    uvicorn.run("server_v4:app", host="0.0.0.0", port=8000, reload=False)
