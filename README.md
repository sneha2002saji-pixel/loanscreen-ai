# LoanScreen AI

Gemini-powered loan pre-qualification chatbot. LoanScreen AI guides users through a conversational interview, collects financial information across a structured 9-stage flow, and produces a real-time eligibility estimate with projected interest rate ranges -- all powered by Google Gemini 2.5 Flash with visible "thinking" tokens streamed to the browser.

> **Disclaimer:** All results produced by this application are pre-qualification estimates, not loan offers.

---

## Features

- **SSE Streaming** -- Server-Sent Events deliver Gemini responses token-by-token for a real-time chat experience
- **Gemini Thinking Visualization** -- Collapsible panel shows the model's internal reasoning (thought tokens) as it processes each message
- **9-Stage Conversation Flow** -- Structured question sequence covering greeting, loan type, income, debts, credit score, assets, eligibility calculation, summary, and completion
- **Eligibility Calculation** -- DTI ratio computation with rate baselines per loan type (Personal 7-24%, Auto 4-15%, Mortgage 5-8%)
- **BigQuery Persistence** -- Users and chat sessions stored in BigQuery with parameterized queries
- **Quick Reply Buttons** -- One-tap selection for loan type and credit score range
- **Pre-Qualification Summary Card** -- Final results with eligibility status, APR range, monthly payment estimate, key factors, and next steps
- **Input Validation** -- Server-side sanitization of all chat messages (HTML stripping, length limits, malicious pattern rejection)
- **Typing Indicator and Streaming UX** -- Visual feedback while Gemini processes and streams responses

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| Language | TypeScript 5 (strict mode) |
| AI Model | [Gemini 2.5 Flash](https://ai.google.dev/) via `@google/genai` SDK |
| Database | [Google BigQuery](https://cloud.google.com/bigquery) (`loanscreen` dataset) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) |
| UI Utilities | `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react` |
| Testing | [Vitest 4](https://vitest.dev/) + Testing Library + jsdom |
| Deployment | Cloud Run via Cloud Build |
| Secrets | GCP Secret Manager |

---

## Getting Started

### Prerequisites

- **Node.js 20+** (the Dockerfile uses `node:20-alpine`)
- **npm** (ships with Node.js)
- A **Gemini API key** from [Google AI Studio](https://aistudio.google.com/)
- (Optional) A **GCP project** with BigQuery enabled for persistence

### Clone and Install

```bash
git clone https://github.com/sneha2002saji-pixel/loanscreen-ai.git
cd loanscreen-ai
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```bash
# Required -- Gemini API key for the AI chatbot
GEMINI_API_KEY=your_gemini_api_key_here

# Required -- GCP project ID for BigQuery access
GCP_PROJECT_ID=your_gcp_project_id
```

**Never commit `.env.local` to version control.** It is already listed in `.gitignore`.

### Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The landing page provides a CTA to start a pre-qualification chat session.

---

## Project Structure

```
loanscreen-ai/
|-- src/
|   |-- app/
|   |   |-- api/
|   |   |   |-- chat/
|   |   |   |   +-- route.ts          # POST -- Gemini streaming chat (SSE)
|   |   |   |-- sessions/
|   |   |   |   +-- route.ts          # POST -- Create chat session
|   |   |   +-- users/
|   |   |       +-- [id]/route.ts     # GET  -- User profile by ID
|   |   |-- layout.tsx                # Root layout with metadata
|   |   |-- page.tsx                  # Landing page with hero and CTA
|   |   +-- globals.css               # Tailwind global styles
|   |-- components/
|   |   |-- ChatContainer.tsx         # Main chat orchestrator (SSE, state)
|   |   |-- ChatInput.tsx             # Text input with send button
|   |   |-- ChatMessage.tsx           # Individual message bubble
|   |   |-- ThinkingPanel.tsx         # Collapsible Gemini thought display
|   |   |-- QuickReplyButtons.tsx     # Loan type / credit score buttons
|   |   |-- SummaryCard.tsx           # Pre-qualification result card
|   |   |-- DisclaimerBanner.tsx      # Reusable disclaimer component
|   |   |-- Header.tsx                # Application header
|   |   +-- TypingIndicator.tsx       # Animated typing dots
|   |-- lib/
|   |   |-- gemini.ts                 # Gemini client, streaming, thought parsing
|   |   |-- bigquery.ts              # BigQuery client and query helpers
|   |   |-- rateEngine.ts            # Rate ranges, DTI calc, eligibility logic
|   |   |-- validators.ts            # Input sanitization and validation
|   |   +-- utils.ts                 # General utility functions (cn, etc.)
|   |-- types/
|   |   |-- chat.ts                  # ChatMessage, StreamChunk, ConversationState
|   |   |-- loan.ts                  # LoanType, RateRange, EligibilityResult
|   |   +-- user.ts                  # User, FinancialProfile
|   +-- __tests__/
|       |-- setup.ts                 # Vitest setup (Testing Library matchers)
|       |-- gemini.test.ts           # Gemini client unit tests
|       |-- rateEngine.test.ts       # Rate engine and DTI calculation tests
|       |-- validators.test.ts       # Input validation tests
|       +-- utils.test.ts            # Utility function tests
|-- public/                          # Static assets (SVGs)
|-- Dockerfile                       # Multi-stage build for Cloud Run
|-- cloudbuild.yaml                  # Cloud Build pipeline definition
|-- vitest.config.ts                 # Vitest configuration
|-- tsconfig.json                    # TypeScript strict configuration
|-- next.config.ts                   # Next.js configuration
+-- package.json                     # Dependencies and scripts
```

---

## Conversation Flow

The chatbot progresses through a fixed sequence of stages. The system prompt instructs Gemini to follow this flow, and the `conversation_stage` field in BigQuery tracks the current position.

```
greeting
    |
    v
loan_type_selection       [Personal Loan] [Auto Loan] [Mortgage]
    |
    v
income_employment         Annual income? Employment status? Employer? Years?
    |
    v
debts_expenses            Rent/mortgage? Car payments? Credit card mins? Other?
    |
    v
credit_score_range        [Excellent 750+] [Good 700-749] [Fair 650-699] [Below 650]
    |
    v
assets                    Savings? Investments? Property?
    |
    v
eligibility_calc          Gemini computes result using collected data + rate baselines
    |
    v
summary                   SummaryCard with eligibility, rates, monthly payment, disclaimer
    |
    v
completed                 [Start New Pre-Qualification] resets session
```

**Stage rules:**
- Each stage must collect all required data points before advancing
- Users cannot skip stages (enforced by system prompt)
- Non-numeric input for numeric fields triggers a clarification re-prompt

**Interest rate baselines:**

| Loan Type | APR Range | DTI Threshold |
|---|---|---|
| Personal Loan | 7% -- 24% | 36% |
| Auto Loan | 4% -- 15% | 36% |
| Mortgage | 5% -- 8% | 43% |

---

## API Endpoints

| Route | Method | Description |
|---|---|---|
| `/api/chat` | POST | Accepts user message + conversation history; streams Gemini response via SSE |
| `/api/users/[id]` | GET | Retrieves user profile from BigQuery by user ID |
| `/api/sessions` | POST | Creates a new chat session record in BigQuery |

The `/api/chat` endpoint returns a `text/event-stream` response with event types: `thinking`, `content`, `stage`, `result`, `error`, and `done`.

---

## Testing

Run the full test suite:

```bash
npx vitest run
```

The project includes 143 tests across 4 test files:

| Test File | Coverage Area |
|---|---|
| `rateEngine.test.ts` | DTI calculation, rate ranges, eligibility logic |
| `validators.test.ts` | Input sanitization, message validation, edge cases |
| `gemini.test.ts` | Gemini client initialization, streaming, thought parsing |
| `utils.test.ts` | Utility functions (cn class merging) |

Run tests in watch mode during development:

```bash
npx vitest
```

Generate coverage report:

```bash
npx vitest run --coverage
```

---

## Deployment

LoanScreen AI deploys to **Google Cloud Run** via **Cloud Build**. The pipeline is defined in `cloudbuild.yaml`.

### Pipeline Steps

1. **Build** -- Multi-stage Docker build (`node:20-alpine`) with standalone Next.js output
2. **Push** -- Image pushed to Artifact Registry (`us-central1-docker.pkg.dev/{PROJECT_ID}/loanscreen/loanscreen-web`)
3. **Deploy** -- Cloud Run deployment with 512 Mi memory, 1 vCPU, port 3000

### Required GCP Setup

- Artifact Registry repository named `loanscreen` in `us-central1`
- Secret Manager secrets: `GEMINI_API_KEY`, `GCP_PROJECT_ID`
- BigQuery dataset `loanscreen` with `users` and `chat_sessions` tables
- Cloud Build trigger connected to the GitHub repository

### Manual Deployment

```bash
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions=SHORT_SHA=$(git rev-parse --short HEAD)
```

### Container Security

- Runs as non-root user (`nextjs:nodejs`, UID/GID 1001)
- Standalone Next.js output minimizes image size
- Telemetry disabled (`NEXT_TELEMETRY_DISABLED=1`)

---

## Architecture

For the full High-Level Design document including system architecture diagrams, data models, API contracts, and the conversation state machine, see the Confluence HLD:

[LoanScreen AI -- High-Level Design](https://bfsi-na-ai-engineering.atlassian.net/wiki/spaces/SCRUM1/pages/18546689)

### Jira Tickets

| Ticket | Title |
|---|---|
| SCRUM-73 | Chatbot UI with Visible Thinking |
| SCRUM-74 | Structured Question Flow |
| SCRUM-75 | Gemini AI-Powered Chatbot Backend |
| SCRUM-76 | Real-Time Eligibility Estimation |
| SCRUM-77 | Pre-Qualification Summary |
| SCRUM-78 | BigQuery Backend with Users Table |
| SCRUM-79 | Next.js 15 Application Scaffold |

---

## License

This project is proprietary and not licensed for public distribution.
