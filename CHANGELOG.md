# Changelog

## [0.1.0] - 2026-03-23

### Added
- Gemini 2.5 Flash-powered chatbot with thinking token visualization
- 9-stage structured conversation flow for loan pre-qualification
- Eligibility calculation engine with rate estimation and risk assessment
- SSE streaming for real-time chat responses
- BigQuery session persistence with parameterized queries
- Custom name input and demo user selection
- Back button navigation between screens
- Calculating indicator with animated spinner
- Quick reply buttons for loan type and credit score
- SummaryCard with eligibility results and next steps
- Disclaimer banner for pre-qualification estimates
- Multi-stage Dockerfile for Cloud Run deployment
- Cloud Build pipeline configuration
- 143 unit tests with Vitest

### Security
- Non-root Docker user
- Input sanitization (XSS prevention)
- BigQuery parameterized queries (SQL injection prevention)
- Secrets via Secret Manager (no hardcoded keys)
