import os
import shutil
import sqlite3
import tempfile

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse

from database import engine, DB_PATH

router = APIRouter()


@router.get("/export")
def export_db():
    """Stream the SQLite database file as a download."""
    if not os.path.exists(DB_PATH):
        raise HTTPException(status_code=404, detail="Database not found")
    return FileResponse(
        DB_PATH,
        media_type="application/octet-stream",
        filename="expense_buddy.db",
    )


@router.post("/import")
async def import_db(db_file: UploadFile = File(...)):
    """
    Replace the current database with an uploaded .db file.
    Validates the file is a valid SQLite database before replacing.
    """
    content = await db_file.read()

    # Validate SQLite magic bytes
    if len(content) < 16 or content[:16] != b"SQLite format 3\x00":
        raise HTTPException(
            status_code=400, detail="Not a valid SQLite database file"
        )

    # Write to temp file and validate integrity
    with tempfile.NamedTemporaryFile(delete=False, suffix=".db") as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        conn = sqlite3.connect(tmp_path)
        result = conn.execute("PRAGMA integrity_check").fetchone()
        conn.close()
        if result[0] != "ok":
            raise ValueError(f"Integrity check failed: {result[0]}")
    except Exception as e:
        os.unlink(tmp_path)
        raise HTTPException(status_code=400, detail=f"Invalid database: {e}")

    # Dispose all active connections before replacing the file
    engine.dispose()
    shutil.move(tmp_path, DB_PATH)

    return {"ok": True, "message": "Database imported successfully"}
