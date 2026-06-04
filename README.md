# Personal Expense Buddy

A local-only expense analyzer. Upload bank statement PDFs → extract & tag transactions → analyze spending.

## Prerequisites

- Python 3.11+
- Node.js 18+
- Azure CLI logged in (`az login`) with access to an Azure OpenAI resource

## Setup

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_DEPLOYMENT
uvicorn main:app --reload
```

API runs at http://localhost:8000

### Frontend

```bash
cd frontend
npm install
npm run dev
```

UI runs at http://localhost:5173

## Usage

1. **Upload** — Select a month, pick your bank statement PDF, and hit Upload & Extract
2. **Dashboard** — View monthly spend summaries and trends
3. **Transactions** — Filter, group, and chart your transactions; edit notes inline
4. **Tag Manager** — Assign categories to LLM-resolved tags for richer reporting

## Export / Import DB

Use the Export / Import buttons on the Transactions page to backup or restore `backend/expense_buddy.db`.
