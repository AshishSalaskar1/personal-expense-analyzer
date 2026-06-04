from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from schemas import UploadResponse, TransactionIn
from services import ocr, llm

router = APIRouter()


@router.post("/upload", response_model=UploadResponse)
async def upload_pdf(
    pdf: UploadFile = File(...),
    month: str = Form(...),  # YYYY-MM, user-selected
):
    """OCR the PDF, extract transactions via LLM, return preview with mismatch flag."""
    try:
        pdf_bytes = await pdf.read()
        pdf_text = ocr.extract_text(pdf_bytes)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    try:
        extracted = llm.extract_transactions(pdf_text)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM extraction failed: {e}")

    detected_month: str | None = extracted.get("detected_month")
    month_mismatch = bool(detected_month and detected_month != month)

    transactions = [
        TransactionIn(**t) for t in extracted.get("transactions", [])
    ]

    return UploadResponse(
        detected_month=detected_month,
        month_mismatch=month_mismatch,
        transactions=transactions,
    )
