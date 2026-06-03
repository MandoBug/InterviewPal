import json
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from app.core.config import get_settings

settings = get_settings()


def _get_mail_config() -> ConnectionConfig:
    return ConnectionConfig(
        MAIL_USERNAME=settings.mail_username,
        MAIL_PASSWORD=settings.mail_password,
        MAIL_FROM=settings.mail_from,
        MAIL_FROM_NAME=settings.mail_from_name,
        MAIL_PORT=settings.mail_port,
        MAIL_SERVER=settings.mail_server,
        MAIL_STARTTLS=True,
        MAIL_SSL_TLS=False,
        USE_CREDENTIALS=True,
    )


def _build_summary_html(
    full_name: str,
    role: str,
    interview_type: str,
    score: int | None,
    feedback_json: str | None,
) -> str:
    feedback_items = []
    if feedback_json:
        try:
            loaded = json.loads(feedback_json)
            if isinstance(loaded, list):
                feedback_items = loaded
        except json.JSONDecodeError:
            pass

    avg_score = score if score is not None else 0
    total_answers = len(feedback_items)

    strengths_html = ""
    improvements_html = ""
    for i, item in enumerate(feedback_items, 1):
        for strength in item.get("strengths", []):
            strengths_html += f"<li>Q{i}: {strength}</li>"
        for improvement in item.get("improvements", []):
            improvements_html += f"<li>Q{i}: {improvement}</li>"

    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
      <div style="background: #1e40af; padding: 32px; border-radius: 16px 16px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🐌 InterviewPal</h1>
        <p style="color: #bfdbfe; margin: 8px 0 0;">Your Interview Summary</p>
      </div>

      <div style="background: #f8fafc; padding: 32px; border-radius: 0 0 16px 16px;">
        <p style="font-size: 18px;">Hi <strong>{full_name}</strong>,</p>
        <p>Great work completing your <strong>{role}</strong> {interview_type} interview! Here's how you did:</p>

        <div style="background: white; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center; border: 1px solid #e2e8f0;">
          <p style="margin: 0; color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Overall Score</p>
          <p style="margin: 8px 0 0; font-size: 48px; font-weight: 900; color: #2563eb;">{avg_score}<span style="font-size: 24px; color: #94a3b8;">/10</span></p>
          <p style="margin: 4px 0 0; color: #64748b;">{total_answers} question{"s" if total_answers != 1 else ""} answered</p>
        </div>

        {f'''
        <div style="margin: 24px 0;">
          <h3 style="color: #16a34a; margin-bottom: 8px;">✅ Strengths</h3>
          <ul style="color: #374151; line-height: 1.8;">{strengths_html}</ul>
        </div>
        ''' if strengths_html else ""}

        {f'''
        <div style="margin: 24px 0;">
          <h3 style="color: #d97706; margin-bottom: 8px;">📈 Areas to Improve</h3>
          <ul style="color: #374151; line-height: 1.8;">{improvements_html}</ul>
        </div>
        ''' if improvements_html else ""}

        <div style="text-align: center; margin-top: 32px;">
          <a href="http://localhost:3000/interview"
             style="background: #2563eb; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px;">
            Practice Again →
          </a>
        </div>

        <p style="margin-top: 32px; color: #94a3b8; font-size: 12px; text-align: center;">
          InterviewPal · AI-powered mock interview prep for UCSC students
        </p>
      </div>
    </div>
    """


async def send_session_summary(
    to_email: str,
    full_name: str,
    role: str,
    interview_type: str,
    score: int | None,
    feedback_json: str | None,
) -> bool:
    if not settings.mail_enabled:
        return False

    try:
        html = _build_summary_html(full_name, role, interview_type, score, feedback_json)
        message = MessageSchema(
            subject=f"Your {role} Interview Summary — InterviewPal",
            recipients=[to_email],
            body=html,
            subtype=MessageType.html,
        )
        fm = FastMail(_get_mail_config())
        await fm.send_message(message)
        return True
    except Exception:
        return False
