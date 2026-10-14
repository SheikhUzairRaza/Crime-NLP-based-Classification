import axios from 'axios';

class MLClient {
  constructor() {
    this.baseURL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
    this.timeout = 8000;
  }

  /**
   * Calls FastAPI DistilBERT microservice
   * @param {string} description - Citizen complaint narrative
   * @returns {Promise<object|null>} Standardized ML prediction or null fallback
   */
  async classify(description) {
    try {
      const response = await axios.post(
        `${this.baseURL}/predict`,
        { text: description },
        { timeout: this.timeout }
      );

      if (response.data && response.data.success) {
        return {
          predicted_category: response.data.predicted_category,
          domain: response.data.domain,
          confidence_score: response.data.confidence_score,
          severity: response.data.severity,
          is_urgent: Boolean(response.data.is_urgent),
          safety_advisory: response.data.safety_advisory,
          top_candidates: response.data.top_candidates,
          classified_at: new Date()
        };
      }
      return null;
    } catch (error) {
      console.warn(`[!] ML Microservice offline or error (${error.message}). Saving report without ML classification.`);
      return {
        predicted_category: null,
        domain: null,
        confidence_score: null,
        severity: null,
        is_urgent: false,
        safety_advisory: null,
        top_candidates: null,
        classified_at: null
      };
    }
  }
}

export const mlClient = new MLClient();
export default mlClient;
