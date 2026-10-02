# Cybercrime & Financial Fraud Dataset Documentation

## 1. Overview & Problem Scope

This document details the architecture, taxonomy, and preprocessing pipeline of the official **Cybercrime & Online Financial Fraud NLP Dataset** used in the **Cybercrime Triage and Threat Prioritization System**.

### Problem Context

Cybercrimes and digital financial frauds (such as UPI/banking scams, WhatsApp harassment, extortion, and account takeovers) are reported by citizens in unstructured natural language. To enable instant threat triage, automated "Golden Hour" bank alerts, and priority case assignment, the system utilizes natural language processing (NLP) to classify incoming complaints into standard criminal categories.

---

## 2. Dataset Source & Provenance

- **Repository:** Hugging Face ([`Dev523/Crime-Reports-Dataset`](https://huggingface.co/datasets/Dev523/Crime-Reports-Dataset))
- **Origin:** Official Cybercrime Reporting Portal citizen complaints.
- **Scale:** ~93,686 records (~86,662 cleaned and filtered high-quality samples).
- **Format:** CSV with authentic complainant narratives.

---

## 3. Dataset Schema

The training dataset utilizes a clean two-attribute schema:

| Column Name                      | Data Type  | Description                                                  | Role in ML Pipeline                                              |
| :------------------------------- | :--------- | :----------------------------------------------------------- | :--------------------------------------------------------------- |
| **`crimeaditionalinfo`** | `String` | Raw unstructured complaint narrative submitted by the victim | **Feature ($X$)** — Input to the NLP vectorizer & model |
| **`category`**           | `String` | Ground truth cybercrime classification category              | **Target ($y$)** — Output multi-class prediction label  |

---

## 4. Cybercrime Categories & Distribution

The dataset spans 15 distinct categories reflecting real-world digital threats:

```
┌──────────────────────────────────────────────┬──────────────┬──────────────┬────────────────────────────────────────────────────────┐
│ Category Name                                │ Records      │ Severity     │ Description & Key Patterns                             │
├──────────────────────────────────────────────┼──────────────┼──────────────┼────────────────────────────────────────────────────────┤
│ Online Financial Fraud                       │ 57,434       │ High (Urgent)│ Bank OTP scams, fake KYC, credit/debit card theft      │
│ Online and Social Media Related Crime        │ 12,140       │ Medium       │ WhatsApp harassment, fake social profiles, stalking    │
│ Any Other Cyber Crime                        │ 10,878       │ Medium       │ Miscellaneous digital complaints & fraud               │
│ Cyber Attack / Dependent Crimes              │ 3,608        │ High (Urgent)│ DDoS, server compromise, unauthorized network access   │
│ Rape / Gang Rape / Sexually Abusive Content  │ 2,822        │ High (Urgent)│ Online abusive content and threat of violence          │
│ Sexually Obscene Material                    │ 1,838        │ Medium       │ Non-consensual media sharing & explicit harassment     │
│ Hacking & Damage to Computer Systems         │ 1,710        │ Medium       │ Social account takeovers, gaming ID theft, malware     │
│ Sexually Explicit Act                        │ 1,552        │ High (Urgent)│ Sextortion and digital extortion demands               │
│ Cryptocurrency Crime                         │ 480          │ Medium       │ Fake crypto exchange schemes, wallet fraud             │
│ Online Gambling & Betting                    │ 444          │ Low          │ Illegal betting portals & deceptive gaming apps        │
│ Child Sexual Abuse Material (CSAM)           │ 379          │ High (Urgent)│ Child exploitation & unlawful material detection       │
│ Online Cyber Trafficking                     │ 183          │ High (Urgent)│ Fake job offers requiring illegal upfront payment      │
│ Cyber Terrorism                              │ 161          │ High (Urgent)│ Digital extortion, state threats, loan shark menace    │
│ Ransomware                                   │ 56           │ High (Urgent)│ System encryption and digital ransom demands           │
│ Report Unlawful Content                      │ 1            │ Low          │ Uncategorized single complaint                         │
└──────────────────────────────────────────────┴──────────────┴──────────────┴────────────────────────────────────────────────────────┘
```

---

## 5. Severity & Advisory Rule Engine

Severity levels are deterministically derived from the predicted category to support automated triage:

1. **High Priority (Golden Hour Triage):**

   - *Categories:* `Online Financial Fraud`, `Cyber Attack`, `Sexually Explicit Act`, `Cyber Terrorism`.
   - *System Action:* Triggers urgent emergency alerts to freeze bank accounts, preserve forensic IP logs, and prioritize officer queues.
   - *Citizen Advisory:* Immediate instruction to call emergency bank helplines (15 / 1991).
2. **Medium Priority (Investigation Queue):**

   - *Categories:* `Online and Social Media Related Crime`, `Hacking`, `Cryptocurrency Crime`.
   - *System Action:* Queues for cyber cell investigation and evidence review.
   - *Citizen Advisory:* Security guides for Two-Factor Authentication (2FA) and profile reporting.
3. **Low Priority (Advisory & Regulatory):**

   - *Categories:* `Online Gambling & Betting`, `Unlawful Content`.
   - *System Action:* Logged for domain filtering and regulatory ISP blocking.

---

## 6. Preprocessing & NLP Pipeline

```
┌────────────────────────────────────────────────────────┐
│ 1. Raw Text Cleaning                                   │
│    - Lowercasing                                       │
│    - Regex removal of URLs (https?://\S+|www\.\S+)     │
│    - Special characters & punctuation normalization    │
│    - Noise removal (samples with < 3 words dropped)    │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│ 2. Feature Extraction (TF-IDF Vectorizer)              │
│    - N-gram Range: (1, 2) [Unigrams + Bigrams]         │
│    - Max Features: 25,000 vocabulary size              │
│    - Sublinear TF Scaling: True                        │
│    - Stopwords: English                                │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│ 3. Classification & Calibration                        │
│    - Base Classifier: Logistic Regression (SAGA, C=3.0)│
│    - Probability Calibration: CalibratedClassifierCV   │
│    - Balanced Class Weights                            │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│ 4. Artifact Persistence                                │
│    - inference/cybercrime_classifier.joblib            │
│    - inference/tfidf_vectorizer.joblib                 │
└────────────────────────────────────────────────────────┘
```

---
