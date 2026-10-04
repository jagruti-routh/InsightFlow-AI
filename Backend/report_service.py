import os
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
)

from database import get_connection


REPORT_DIR = os.path.join(
    os.path.dirname(__file__),
    "reports"
)

os.makedirs(REPORT_DIR, exist_ok=True)


def generate_meeting_report(meeting_id: int):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        # ---------------------------------------------------------
        # 1. MEETING INFORMATION
        # ---------------------------------------------------------

        cursor.execute(
            """
            SELECT
                meeting_id,
                title,
                description,
                meeting_date,
                meeting_time,
                duration,
                file_name,
                file_format,
                file_size,
                meeting_status,
                uploaded_by
            FROM meetings
            WHERE meeting_id = %s
            """,
            (meeting_id,)
        )

        meeting = cursor.fetchone()

        if not meeting:
            raise ValueError(
                f"Meeting {meeting_id} not found."
            )

        (
            meeting_id,
            title,
            description,
            meeting_date,
            meeting_time,
            duration,
            file_name,
            file_format,
            file_size,
            meeting_status,
            uploaded_by,
        ) = meeting


        # ---------------------------------------------------------
        # 2. AI INSIGHTS
        # ---------------------------------------------------------

        cursor.execute(
            """
            SELECT
                summary,
                keywords,
                sentiment,
                meeting_category,
                overall_priority,
                confidence_score
            FROM meeting_insights
            WHERE meeting_id = %s
            ORDER BY insight_id DESC
            LIMIT 1
            """,
            (meeting_id,)
        )

        insight = cursor.fetchone()

        if insight:

            (
                summary,
                keywords,
                sentiment,
                meeting_category,
                overall_priority,
                confidence_score,
            ) = insight

        else:

            summary = "No AI summary available."
            keywords = None
            sentiment = "N/A"
            meeting_category = "N/A"
            overall_priority = "N/A"
            confidence_score = 0


        # ---------------------------------------------------------
        # 3. TASKS
        # ---------------------------------------------------------

        cursor.execute(
            """
            SELECT
                task_title,
                task_description,
                priority_level,
                deadline,
                status,
                assigned_to
            FROM tasks
            WHERE meeting_id = %s
            ORDER BY task_id
            """,
            (meeting_id,)
        )

        tasks = cursor.fetchall()


        # ---------------------------------------------------------
        # 4. DECISIONS
        # ---------------------------------------------------------

        cursor.execute(
            """
            SELECT
                decision_text,
                decision_category,
                importance_level
            FROM decisions
            WHERE meeting_id = %s
            ORDER BY decision_id
            """,
            (meeting_id,)
        )

        decisions = cursor.fetchall()


        # ---------------------------------------------------------
        # 5. RISKS
        # ---------------------------------------------------------

        cursor.execute(
            """
            SELECT
                risk_description,
                risk_level,
                mitigation_plan,
                status
            FROM risks
            WHERE meeting_id = %s
            ORDER BY risk_id
            """,
            (meeting_id,)
        )

        risks = cursor.fetchall()


        # ---------------------------------------------------------
        # 6. PROCESSING LOGS
        # ---------------------------------------------------------

        cursor.execute(
            """
            SELECT
                current_stage,
                status,
                processing_time,
                error_message
            FROM ai_processing_logs
            WHERE meeting_id = %s
            ORDER BY job_id
            """,
            (meeting_id,)
        )

        processing_logs = cursor.fetchall()


        # ---------------------------------------------------------
        # 7. REPORT PATH
        # ---------------------------------------------------------

        report_filename = (
            f"Meeting_{meeting_id}_Report.pdf"
        )

        report_path = os.path.join(
            REPORT_DIR,
            report_filename
        )


        # ---------------------------------------------------------
        # 8. PDF DOCUMENT
        # ---------------------------------------------------------

        document = SimpleDocTemplate(
            report_path,
            pagesize=A4,
            rightMargin=18 * mm,
            leftMargin=18 * mm,
            topMargin=18 * mm,
            bottomMargin=18 * mm,
        )

        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            "ReportTitle",
            parent=styles["Title"],
            alignment=TA_CENTER,
            fontSize=20,
            spaceAfter=12,
        )

        section_style = ParagraphStyle(
            "Section",
            parent=styles["Heading2"],
            fontSize=14,
            spaceBefore=12,
            spaceAfter=8,
        )

        normal_style = ParagraphStyle(
            "NormalCustom",
            parent=styles["BodyText"],
            fontSize=9.5,
            leading=14,
            spaceAfter=6,
        )

        small_style = ParagraphStyle(
            "Small",
            parent=styles["BodyText"],
            fontSize=8,
            leading=11,
        )


        story = []


        # ---------------------------------------------------------
        # TITLE
        # ---------------------------------------------------------

        story.append(
            Paragraph(
                "InsightFlow AI",
                title_style
            )
        )

        story.append(
            Paragraph(
                "Business Meeting Intelligence Report",
                styles["Heading2"]
            )
        )

        story.append(Spacer(1, 8))

        story.append(
            Paragraph(
                f"<b>{title}</b>",
                styles["Heading1"]
            )
        )

        story.append(Spacer(1, 10))


        # ---------------------------------------------------------
        # MEETING INFORMATION
        # ---------------------------------------------------------

        story.append(
            Paragraph(
                "1. Meeting Information",
                section_style
            )
        )

        meeting_data = [
            ["Meeting ID", str(meeting_id)],
            ["Title", str(title or "N/A")],
            ["Date", str(meeting_date or "N/A")],
            ["Time", str(meeting_time or "N/A")],
            ["Duration", f"{duration} seconds" if duration else "N/A"],
            ["File", str(file_name or "N/A")],
            ["Format", str(file_format or "N/A")],
            ["Status", str(meeting_status or "N/A")],
        ]

        meeting_table = Table(
            meeting_data,
            colWidths=[45 * mm, 125 * mm]
        )

        meeting_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (0, -1), colors.lightgrey),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("PADDING", (0, 0), (-1, -1), 6),
            ])
        )

        story.append(meeting_table)


        # ---------------------------------------------------------
        # EXECUTIVE SUMMARY
        # ---------------------------------------------------------

        story.append(
            Paragraph(
                "2. Executive Summary",
                section_style
            )
        )

        story.append(
            Paragraph(
                str(summary or "No summary available."),
                normal_style
            )
        )


        # ---------------------------------------------------------
        # AI ANALYSIS
        # ---------------------------------------------------------

        story.append(
            Paragraph(
                "3. AI Analysis",
                section_style
            )
        )

        ai_data = [
            ["Sentiment", str(sentiment or "N/A")],
            ["Meeting Category", str(meeting_category or "N/A")],
            ["Overall Priority", str(overall_priority or "N/A")],
            [
                "Confidence Score",
                f"{float(confidence_score) * 100:.1f}%"
                if confidence_score is not None
                else "N/A"
            ],
        ]

        ai_table = Table(
            ai_data,
            colWidths=[55 * mm, 115 * mm]
        )

        ai_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (0, -1), colors.lightgrey),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("PADDING", (0, 0), (-1, -1), 6),
            ])
        )

        story.append(ai_table)


        # ---------------------------------------------------------
        # TASKS
        # ---------------------------------------------------------

        story.append(
            Paragraph(
                "4. Action Items / Tasks",
                section_style
            )
        )

        if tasks:

            task_data = [
                [
                    "Task",
                    "Description",
                    "Priority",
                    "Deadline",
                    "Status",
                ]
            ]

            for task in tasks:

                (
                    task_title,
                    task_description,
                    priority,
                    deadline,
                    status,
                    assigned_to,
                ) = task

                task_data.append([
                    Paragraph(
                        str(task_title or ""),
                        small_style
                    ),
                    Paragraph(
                        str(task_description or ""),
                        small_style
                    ),
                    str(priority or "N/A"),
                    str(deadline or "N/A"),
                    str(status or "N/A"),
                ])

            task_table = Table(
                task_data,
                repeatRows=1,
                colWidths=[
                    32 * mm,
                    63 * mm,
                    23 * mm,
                    25 * mm,
                    22 * mm,
                ]
            )

            task_table.setStyle(
                TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 7.5),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("PADDING", (0, 0), (-1, -1), 4),
                ])
            )

            story.append(task_table)

        else:

            story.append(
                Paragraph(
                    "No tasks identified.",
                    normal_style
                )
            )


        # ---------------------------------------------------------
        # DECISIONS
        # ---------------------------------------------------------

        story.append(
            Paragraph(
                "5. Decisions",
                section_style
            )
        )

        if decisions:

            decision_data = [
                [
                    "Decision",
                    "Category",
                    "Importance",
                ]
            ]

            for decision in decisions:

                (
                    decision_text,
                    category,
                    importance,
                ) = decision

                decision_data.append([
                    Paragraph(
                        str(decision_text or ""),
                        small_style
                    ),
                    str(category or "N/A"),
                    str(importance or "N/A"),
                ])

            decision_table = Table(
                decision_data,
                repeatRows=1,
                colWidths=[
                    100 * mm,
                    40 * mm,
                    30 * mm,
                ]
            )

            decision_table.setStyle(
                TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("PADDING", (0, 0), (-1, -1), 5),
                ])
            )

            story.append(decision_table)

        else:

            story.append(
                Paragraph(
                    "No decisions identified.",
                    normal_style
                )
            )


        # ---------------------------------------------------------
        # RISKS
        # ---------------------------------------------------------

        story.append(
            Paragraph(
                "6. Risks and Mitigation",
                section_style
            )
        )

        if risks:

            risk_data = [
                [
                    "Risk",
                    "Severity",
                    "Mitigation",
                    "Status",
                ]
            ]

            for risk in risks:

                (
                    risk_description,
                    risk_level,
                    mitigation_plan,
                    status,
                ) = risk

                risk_data.append([
                    Paragraph(
                        str(risk_description or ""),
                        small_style
                    ),
                    str(risk_level or "N/A"),
                    Paragraph(
                        str(mitigation_plan or ""),
                        small_style
                    ),
                    str(status or "N/A"),
                ])

            risk_table = Table(
                risk_data,
                repeatRows=1,
                colWidths=[
                    50 * mm,
                    25 * mm,
                    70 * mm,
                    25 * mm,
                ]
            )

            risk_table.setStyle(
                TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("PADDING", (0, 0), (-1, -1), 5),
                ])
            )

            story.append(risk_table)

        else:

            story.append(
                Paragraph(
                    "No risks identified.",
                    normal_style
                )
            )


        # ---------------------------------------------------------
        # PROCESSING INFORMATION
        # ---------------------------------------------------------

        story.append(PageBreak())

        story.append(
            Paragraph(
                "7. AI Processing Information",
                section_style
            )
        )

        if processing_logs:

            processing_data = [
                [
                    "Stage",
                    "Status",
                    "Processing Time",
                ]
            ]

            for log in processing_logs:

                (
                    stage,
                    status,
                    processing_time,
                    error_message,
                ) = log

                processing_data.append([
                    str(stage or "N/A"),
                    str(status or "N/A"),
                    (
                        f"{processing_time:.2f} sec"
                        if processing_time is not None
                        else "N/A"
                    ),
                ])

            processing_table = Table(
                processing_data,
                repeatRows=1,
                colWidths=[
                    70 * mm,
                    45 * mm,
                    55 * mm,
                ]
            )

            processing_table.setStyle(
                TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("PADDING", (0, 0), (-1, -1), 6),
                ])
            )

            story.append(processing_table)


        story.append(Spacer(1, 20))

        story.append(
            Paragraph(
                "Generated by InsightFlow AI — Business Meeting Intelligence Platform",
                small_style
            )
        )


        # ---------------------------------------------------------
        # BUILD PDF
        # ---------------------------------------------------------

        document.build(story)


        # ---------------------------------------------------------
        # SAVE REPORT METADATA
        # ---------------------------------------------------------

        report_name = (
            f"Meeting_{meeting_id}_Report"
        )

        report_type = "Meeting Report"
        report_format = "PDF"

        relative_path = os.path.join(
            "reports",
            report_filename
        )

        cursor.execute(
            """
            INSERT INTO reports
            (
                meeting_id,
                report_name,
                report_type,
                report_format,
                file_path,
                generated_by,
                generated_at
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s
            )
            RETURNING report_id
            """,
            (
                meeting_id,
                report_name,
                report_type,
                report_format,
                relative_path,
                uploaded_by,
                datetime.now(),
            )
        )

        report_id = cursor.fetchone()[0]

        connection.commit()

        return {
            "report_id": report_id,
            "meeting_id": meeting_id,
            "report_name": report_name,
            "report_type": report_type,
            "report_format": report_format,
            "file_path": relative_path,
            "generated_by": uploaded_by,
            "generated_at": datetime.now().isoformat(),
        }


    except Exception:

        connection.rollback()
        raise


    finally:

        cursor.close()
        connection.close()