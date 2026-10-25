"""
Incident Normalizer & Multilingual / Roman Urdu Translator
Translates Roman Urdu, Hindi, Urdu, or informal slang into clear, formal English crime complaints
before passing them to the fine-tuned DeBERTa-v3 NLP classification model.

Supports:
1. GroqCloud API (GROQ_API_KEY or GROK_API_KEY) with ultra-fast inference (qwen/qwen3.8-27b)
2. Google Gemini API (GEMINI_API_KEY) as alternative LLM
3. Seamless fallback to original raw text if no API key is provided or network fails.
"""

import os
import re
import json
import urllib.request
import urllib.error
from pathlib import Path
from typing import Tuple

# Automatically load backend/.env or local .env if keys not present in system environment
def _load_env_fallback():
    candidates = [
        Path(__file__).resolve().parent.parent / "backend" / ".env",
        Path(__file__).resolve().parent / ".env",
        Path(".env"),
        Path("backend/.env"),
    ]
    for env_path in candidates:
        if env_path.exists():
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            k, v = k.strip(), v.strip().strip("'").strip('"')
                            if k not in os.environ:
                                os.environ[k] = v
            except Exception:
                pass
            break

_load_env_fallback()

SYSTEM_PROMPT = """You are an official law enforcement and cybercrime intake officer.
Your task is to convert citizen crime reports into clear, grammatically sound, factual English complaint statements.

Rules:
1. If the input is in Roman Urdu, Hindi, Urdu, or informal slang (e.g., 'mera phone cheen lia gun dikha kar saddar mein'), translate it into clear, formal, and concise English (e.g., 'An armed individual held me at gunpoint and snatched my mobile phone in Saddar.').
2. If the input is very short or telegraphic (e.g., 'gun snatching' or 'hacked'), expand it into a proper complete complaint sentence without inventing unmentioned specifics.
3. If the input is already in standard English, refine grammar and clarity while strictly preserving all factual details (amounts, locations, usernames, methods, weapons).
4. Never add fictional facts, dates, suspect names, or locations that were not stated or clearly implied by the victim.
5. Return ONLY the final clear English paragraph. Do not add conversational remarks, explanations, quotes, or markdown prefixes."""


def _translate_with_groq(text: str, api_key: str) -> Tuple[str, bool]:
    """Translates text using GroqCloud API."""
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CrimeNLP/4.0"
    }
    model_name = os.environ.get("GROQ_MODEL", "qwen/qwen3.8-27b")
    payload = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": text.strip()}
        ],
        "temperature": 0.1,
        "max_tokens": 200
    }

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers
        )
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            content = data["choices"][0]["message"]["content"].strip()
            # Clean possible surrounding quotes
            content = content.strip('"').strip("'")
            if len(content) > 0:
                return content, True
    except Exception as e:
        print(f"[WARN] Groq translation fallback: {e}")

    return text.strip(), False


def _translate_with_gemini(text: str, api_key: str) -> Tuple[str, bool]:
    """Translates text using Google Gemini API."""
    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        model_name = os.environ.get("GEMINI_MODEL", "gemini-3.8-flash")
        
        response = client.models.generate_content(
            model=model_name,
            contents=text.strip(),
            config={
                "system_instruction": SYSTEM_PROMPT,
                "temperature": 0.1,
                "max_output_tokens": 250,
            }
        )
        if response and response.text:
            cleaned = response.text.strip().strip('"').strip("'")
            if len(cleaned) > 0:
                return cleaned, True
    except Exception as err:
        print(f"[WARN] Gemini translation fallback: {err}")

    return text.strip(), False


def normalize_and_translate(text: str) -> Tuple[str, bool]:
    """
    Translates/normalizes input text using Groq or Gemini API if available.

    Args:
        text (str): Raw citizen complaint text (English, Roman Urdu, mixed, etc.)

    Returns:
        Tuple[str, bool]: (normalized_english_text, is_translated_by_llm)
    """
    if not text or len(text.strip()) == 0:
        return text, False

    clean_raw = text.strip()

    # 1. Try Groq (GROQ_API_KEY or GROK_API_KEY)
    groq_key = os.environ.get("GROQ_API_KEY") or os.environ.get("GROK_API_KEY")
    if groq_key:
        translated, ok = _translate_with_groq(clean_raw, groq_key)
        if ok:
            return translated, True

    # 2. Try Gemini (GEMINI_API_KEY or GOOGLE_API_KEY)
    gemini_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if gemini_key:
        translated, ok = _translate_with_gemini(clean_raw, gemini_key)
        if ok:
            return translated, True

    # 3. Fallback to raw text
    return clean_raw, False


if __name__ == "__main__":
    test_inputs = [
        "Mera phone cheen lia gun dikha kar Saddar mein",
        "gun snatching",
        "hacker ne mera insta hack krlia aur dost ko paise mang rha",
        "Someone broke into my bedroom and stole jewelry"
    ]
    print("Testing Normalizer with Groq/Gemini:")
    for inp in test_inputs:
        norm, was_translated = normalize_and_translate(inp)
        print(f"\nOriginal   : {inp}")
        print(f"Normalized : {norm} (LLM Used: {was_translated})")
