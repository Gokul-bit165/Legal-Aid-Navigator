from sqlalchemy.orm import Session

from app.models import AuditEvent


def log(db: Session, request_pk: str, actor: str, action: str, detail: str = "") -> None:
    db.add(AuditEvent(request_id=request_pk, actor=actor, action=action, detail=detail))
