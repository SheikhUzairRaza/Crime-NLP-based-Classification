# Vigilex AI: Crime & Cybercrime Dataset Documentation (v4)

## 1. Overview & Problem Scope
The **Vigilex AI Dataset** is an enterprise-grade multi-class natural language processing corpus developed to classify unstructured citizen crime reports into **47 distinct crime categories** (12 Cybercrime, 34 Physical Crime, and 1 Benign Non-Crime control group).

- **Total Scale:** 92,990 narrative records.
- **Task Formulation:** Multi-class text classification ($X \rightarrow y$, where $y \in \{0, \dots, 46\}$).
- **Core Challenge Solved:** Bridges informal, colloquial citizen language (including Roman Urdu and typo-heavy messages) with standard legal and law enforcement taxonomy.

---

## 2. Dataset Sourcing & Provenance
To ensure broad real-world generalization across both digital cyber attacks and street/physical crimes, the dataset combines authentic empirical research corpora with structured compositional synthesis:

### 2.1 Empirical Real-World Corpora
1. **Nazario Phishing Corpus (~1,200 rows):** Real phishing emails containing credential harvesting and spoofed login lures mapped to `phishing_smishing`.
2. **IMC 2025 User-Reported Smishing Dataset (~2,100 rows):** Real-world English SMS scams targeting banking OTPs, package tracking, and impersonation. Mapped to `phishing_smishing` and `online_scam_fraud`.
3. **Cyberbullying Tweets Corpus (~3,100 rows):** Authenticated social media harassment across race, religion, gender, and sexual identity. Mapped to `cyberbullying_harassment`.
4. **Gender-Based Violence Personal Narrative Tweets (~1,800 rows):** First-person victim account statements mapped to `sexual_assault` and `domestic_violence_child_abuse`.
5. **UCI SMS Spam Collection (~1,500 rows):** Mobile spam and clean SMS messages mapped to `phishing_smishing` and `non_crime`.
6. **Legitimate Control Ham Sets (~4,000 rows):** Legitimate emails, weather inquiries, and daily customer inquiries mapped to `non_crime` to prevent false-positive over-triggering.

### 2.2 Compositional Scenario Synthesis
- **Scenario Diversity:** 13 to 29 distinct operational scenarios per category (averaging 18+ unique scenarios per class).
- **8 Perspective Writing Styles:** Police reports, victim emergency calls, witness statements, social media alerts, incident logs, emails, news agency briefs, and short 1-line emergency calls.
- **Noise Injection:** 30% of records feature realistic typing noise, spelling slips, and colloquial shorthand.

---

## 3. Complete 47-Category Taxonomy & Distribution

| Group / Domain | Categories Count | Total Records | Key Categories |
| :--- | :---: | :---: | :--- |
| **Cybercrime** | 12 | 28,670 | Phishing, Banking Fraud, Hacking, Ransomware, Data Breach, Sextortion, Crypto Fraud |
| **Violent & Sexual** | 14 | 25,974 | Homicide, Robbery, Assault, Kidnapping, Rape, Domestic Violence, Hate Crime, Mob Violence |
| **Property Crime** | 5 | 9,971 | Burglary, Theft & Pickpocketing, Motor Vehicle Theft, Arson & Vandalism, Land Grabbing |
| **Financial & White-Collar** | 6 | 12,900 | Document Forgery, Bribery/Embezzlement, Medical Fraud, Consumer Adulteration, Drug Offences |
| **Public Order & Regulatory** | 9 | 15,475 | Illegal Weapons, Terrorism, Illegal Gambling, Smuggling, Electoral Fraud, Perjury |
| **Non-Crime Control** | 1 | 5,224 | Harmless questions, lost items, noise complaints, false alarms |
| **TOTAL** | **47** | **92,990** | Complete legal & digital crime coverage |

---

## 4. Evaluation Benchmarks
- **Held-out Unseen Scenario Test (15,000 rows):** 86.2% Accuracy.
- **Strict Independent Gold Benchmark (`gold_test_strict.csv`, 270 rows):** **94.4% Accuracy (0.948 Macro-F1)**.
- **Borderline Multi-Crime Set (`gold_hard.csv`, 15 rows):** 66.7% Accuracy.
- **Out-of-Scope Noise Rejection (`gold_out_of_scope.csv`, 25 rows):** 96% correctly rejected as `non_crime`.
