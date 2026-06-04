import os
import json
from typing import Optional
from openai import AzureOpenAI
from azure.identity import AzureCliCredential

_credential: Optional[AzureCliCredential] = None
_client: Optional[AzureOpenAI] = None

CHUNK_SIZE = 100  # max particulars per LLM tag-resolution call


def get_llm_client() -> AzureOpenAI:
    global _credential, _client
    if _client is None:
        _credential = AzureCliCredential()
        _client = AzureOpenAI(
            azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
            azure_ad_token_provider=lambda: _credential.get_token(
                "https://cognitiveservices.azure.com/.default"
            ).token,
            api_version="2024-02-01",
        )
    return _client


def _deployment() -> str:
    return os.environ.get("AZURE_OPENAI_DEPLOYMENT", "gpt-4")


def extract_transactions(pdf_text: str) -> dict:
    """
    Send OCR text to LLM and receive structured transaction data.
    Returns: {detected_month: "YYYY-MM", transactions: [{date, amount, type, particulars, comments}]}
    """
    client = get_llm_client()

    system_prompt = """You are a bank statement parser. Extract ALL financial transactions from the provided bank statement text.

Return a JSON object with EXACTLY this structure:
{
  "detected_month": "YYYY-MM",
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "amount": 1234.56,
      "type": "debit",
      "particulars": "UPI/SWIGGY/123456789",
      "comments": null
    }
  ]
}

Rules:
- detected_month: the primary month (YYYY-MM) that most transactions belong to
- date: convert any date format to ISO YYYY-MM-DD
- amount: a positive number — absolute value, never negative
- type: "debit" if money left the account, "credit" if money came in
- particulars: the full transaction description/narration exactly as it appears
- comments: always null (user fills this later)
- Only include actual transactions — skip summary rows, balance rows, totals
- Return ONLY the JSON object, no explanations or markdown"""

    response = client.chat.completions.create(
        model=_deployment(),
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": pdf_text},
        ],
        response_format={"type": "json_object"},
        temperature=0,
    )

    return json.loads(response.choices[0].message.content)


def resolve_tags_batch(particulars_list: list[str]) -> dict[str, str]:
    """
    Send a batch of raw particulars to LLM and receive {particular: tag} mapping.
    Processes in chunks to respect context limits.
    """
    if not particulars_list:
        return {}

    client = get_llm_client()
    result: dict[str, str] = {}

    system_prompt = """You are a financial transaction identifier. Given a list of raw bank transaction particulars/descriptions (typically from Indian bank statements), return a clean human-readable tag for each one.

The tag should represent the app, service, or merchant — NOT a broad category.

Examples:
- "UPI/zeptomarketplac/AIRTELPAYMENTS/548217314718" → "Zepto"
- "UPI/SWIGGY/SWIGGYIT/123456" → "Swiggy"
- "NEFT/HDFC CREDIT CARD/123" → "HDFC Credit Card"
- "ACT FIBERNET/BILL/2024" → "ACT Fibernet"
- "ATM/CASH WDL/SBI/001" → "ATM Withdrawal"
- "UPI/Amazon/AMZNMKTP" → "Amazon"

Return ONLY a JSON object mapping each particular to its tag.
IMPORTANT: The JSON keys must be EXACTLY the same strings as provided in the input list.
Return JSON only, no other text."""

    for i in range(0, len(particulars_list), CHUNK_SIZE):
        chunk = particulars_list[i : i + CHUNK_SIZE]

        response = client.chat.completions.create(
            model=_deployment(),
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(chunk)},
            ],
            response_format={"type": "json_object"},
            temperature=0,
        )

        chunk_result = json.loads(response.choices[0].message.content)
        result.update(chunk_result)

    return result
