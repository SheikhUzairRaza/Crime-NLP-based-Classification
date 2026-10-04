import os
import sys
from typing import Optional, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from inference.v3.predict_v3 import predict_crime, CATEGORY_RULES

app = FastAPI(
    title="Crime & Cybercrime NLP Classification Microservice",
    description="Fine-tuned DistilBERT v3 inference engine for Cyber & Physical Crime Triage",
    version="3.0.0"
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
    confidence: float


class PredictionResponse(BaseModel):
    success: bool
    input_text: str
    predicted_category: str
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
        "service": "crime-nlp-engine-v3",
        "model_version": "DistilBERT-v3",
        "categories_supported": len(CATEGORY_RULES),
        "domains": ["Cyber", "Physical"]
    }


@app.get("/categories")
def get_categories():
    return {
        "count": len(CATEGORY_RULES),
        "categories": [
            {
                "name": name,
                "domain": rules["domain"],
                "severity": rules["severity"],
                "is_urgent": rules["is_urgent"],
                "advisory": rules["advisory"]
            }
            for name, rules in CATEGORY_RULES.items()
        ]
    }


@app.post("/predict", response_model=PredictionResponse)
def predict_endpoint(payload: PredictionRequest):
    try:
        res = predict_crime(payload.text)
        return {
            "success": True,
            "input_text": payload.text,
            "predicted_category": res["predicted_category"],
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
    print("[*] Starting Crime NLP Microservice v3 on port 8000...")
    uvicorn.run("server_v3:app", host="0.0.0.0", port=8000, reload=False)
