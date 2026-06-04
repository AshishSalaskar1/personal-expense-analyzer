import io
import pdfplumber


def extract_text(pdf_bytes: bytes) -> str:
    """Extract all text from a PDF file given its raw bytes."""
    text_parts = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)

    result = "\n".join(text_parts).strip()
    if not result:
        raise ValueError(
            "No text could be extracted from this PDF. "
            "It may be a scanned/image-based PDF which is not currently supported."
        )
    return result
