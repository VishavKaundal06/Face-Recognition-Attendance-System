"""
Reports Router
--------------
Generates downloadable reports in CSV, Excel, and PDF formats.
"""

import io
from datetime import date
from typing import Optional

import pandas as pd
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
from models import Attendance

router = APIRouter(prefix="/api/reports", tags=["Reports"])


def _build_dataframe(
    db: Session,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    user_id: Optional[int] = None,
) -> pd.DataFrame:
    q = db.query(Attendance)
    if start_date:
        q = q.filter(Attendance.date >= start_date)
    if end_date:
        q = q.filter(Attendance.date <= end_date)
    if user_id:
        q = q.filter(Attendance.user_id == user_id)
    records = q.order_by(Attendance.date.desc(), Attendance.time.desc()).all()

    rows = []
    for r in records:
        rows.append({
            "Attendance ID": r.id,
            "Employee ID": r.user.employee_id if r.user else "",
            "Name": r.user.name if r.user else "",
            "Department": r.user.department if r.user else "",
            "Date": r.date.strftime("%Y-%m-%d"),
            "Check-In Time": r.time.strftime("%H:%M:%S"),
            "Status": r.status,
        })
    return pd.DataFrame(rows)


# ─── CSV Export ────────────────────────────────────────────────
@router.get("/csv")
def export_csv(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    df = _build_dataframe(db, start_date, end_date, user_id)
    output = io.StringIO()
    df.to_csv(output, index=False)
    output.seek(0)
    filename = f"attendance_{date.today()}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ─── Excel Export ──────────────────────────────────────────────
@router.get("/excel")
def export_excel(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    df = _build_dataframe(db, start_date, end_date, user_id)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Attendance")
    output.seek(0)
    filename = f"attendance_{date.today()}.xlsx"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ─── PDF Export ────────────────────────────────────────────────
@router.get("/pdf")
def export_pdf(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import cm
    from reportlab.platypus import (
        Paragraph,
        SimpleDocTemplate,
        Spacer,
        Table,
        TableStyle,
    )

    df = _build_dataframe(db, start_date, end_date, user_id)
    output = io.BytesIO()

    doc = SimpleDocTemplate(output, pagesize=landscape(A4), rightMargin=1 * cm, leftMargin=1 * cm, topMargin=1.5 * cm, bottomMargin=1 * cm)
    styles = getSampleStyleSheet()
    elements = []

    title = Paragraph("Attendance Report", styles["Title"])
    elements.append(title)
    elements.append(Spacer(1, 0.3 * cm))
    subtitle = Paragraph(f"Generated: {date.today()}", styles["Normal"])
    elements.append(subtitle)
    elements.append(Spacer(1, 0.5 * cm))

    # Table data
    if df.empty:
        elements.append(Paragraph("No records found for the selected filters.", styles["Normal"]))
    else:
        data = [list(df.columns)] + df.values.tolist()
        table = Table(data, repeatRows=1)
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f4f8")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc")),
            ("FONTSIZE", (0, 1), (-1, -1), 8),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
        ]))
        elements.append(table)

    doc.build(elements)
    output.seek(0)
    filename = f"attendance_{date.today()}.pdf"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
