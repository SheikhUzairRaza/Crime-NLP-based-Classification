import os
import sys
from typing import Optional, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from inference.v2.predict_v2 import get_predictor, CATEGORY_RULES

app = FastAPI(
    title="Cybercrime NLP Classification Microservice",
    description="DistilBERT inference engine for cybercrime and fraud triage",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

predictor = None

@app.on_event("startup")
def startup_event():
    global predictor
    print("Initializing DistilBERT Predictor on FastAPI startup...")
    predictor = get_predictor()
    print("Model ready to serve requests on port 8000!")


class PredictionRequest(BaseModel):
    text: str = Field(..., min_length=3, description="Citizen complaint narrative text")

class CandidatePrediction(BaseModel):
    category: str
    confidence: float

class PredictionResponse(BaseModel):
    success: bool
    input_text: str
    predicted_category: str
    confidence_score: float
    severity: str
    is_urgent: bool
    requires_human_review: bool
    safety_advisory: str
    top_3_predictions: List[CandidatePrediction]


@app.get("/health")
def health_check():
    return {
        "status": "online",
        "service": "cybercrime-nlp-engine",
        "model_version": "DistilBERT-v2",
        "device": "CPU",
        "categories_supported": len(CATEGORY_RULES)
    }


@app.get("/categories")
def get_categories():
    return {
        "categories": [
            {
                "category": cat,
                "severity": rule["severity"],
                "is_urgent": rule["is_urgent"],
                "safety_advisory": rule["advisory"]
            }
            for cat, rule in CATEGORY_RULES.items()
        ]
    }


@app.post("/predict", response_model=PredictionResponse)
def predict_crime(request: PredictionRequest):
    global predictor
    if not predictor:
        predictor = get_predictor()

    try:
        raw_result = predictor.predict(request.text)
        return {
            "success": True,
            "input_text": raw_result["input_text"],
            "predicted_category": raw_result["predicted_category"],
            "confidence_score": raw_result["confidence_score"],
            "severity": raw_result["severity"],
            "is_urgent": raw_result["is_urgent"],
            "requires_human_review": raw_result["requires_human_review"],
            "safety_advisory": raw_result["safety_advisory"],
            "top_3_predictions": raw_result["top_3_predictions"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=False)
