import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship
from app.database.connection import Base

class User(Base):
    """
    SQLAlchemy model representing an authenticated user.
    """
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: uuid.uuid4().hex)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True, index=True)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    meetings = relationship("Meeting", back_populates="user", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class Meeting(Base):
    """
    SQLAlchemy model representing a meeting recording session.
    """
    __tablename__ = "meetings"

    id = Column(String, primary_key=True, default=lambda: uuid.uuid4().hex)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    filename = Column(String, nullable=False)
    status = Column(String, nullable=False, default="uploaded")
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="meetings")
    transcript = relationship("Transcript", back_populates="meeting", uselist=False, cascade="all, delete-orphan")
    summary = relationship("Summary", back_populates="meeting", uselist=False, cascade="all, delete-orphan")
    action_items = relationship("ActionItem", back_populates="meeting", cascade="all, delete-orphan")
    decisions = relationship("Decision", back_populates="meeting", cascade="all, delete-orphan")
    deadlines = relationship("Deadline", back_populates="meeting", cascade="all, delete-orphan")
    risks = relationship("Risk", back_populates="meeting", cascade="all, delete-orphan")
    follow_up_topics = relationship("FollowUpTopic", back_populates="meeting", cascade="all, delete-orphan")

    def to_dict(self):
        action_items_list = [ai.to_dict() for ai in self.action_items] if self.action_items else []
        decisions_list = [d.to_dict() for d in self.decisions] if self.decisions else []
        deadlines_list = [dl.to_dict() for dl in self.deadlines] if self.deadlines else []
        risks_list = [r.to_dict() for r in self.risks] if self.risks else []
        follow_ups_list = [f.to_dict() for f in self.follow_up_topics] if self.follow_up_topics else []

        summary_content = self.summary.content if self.summary else None

        return {
            "id": self.id,
            "user_id": self.user_id,
            "filename": self.filename,
            "status": self.status,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "transcript": self.transcript.content if self.transcript else None,
            "summary": self.summary.content if self.summary else None,
            "action_items": action_items_list,
            "decisions": [d["content"] for d in decisions_list],
            "deadlines": deadlines_list,
            "risks": [r["content"] for r in risks_list],
            "follow_up_topics": [f["topic"] for f in follow_ups_list],
            "analysis": {
                "summary": summary_content,
                "action_items": action_items_list,
                "decisions": [d["content"] for d in decisions_list],
                "deadlines": deadlines_list,
                "risks": [r["content"] for r in risks_list],
                "follow_up_topics": [f["topic"] for f in follow_ups_list]
            }
        }


class Transcript(Base):
    __tablename__ = "transcripts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    meeting_id = Column(String, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, unique=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    meeting = relationship("Meeting", back_populates="transcript")

    def to_dict(self):
        return {
            "id": self.id,
            "meeting_id": self.meeting_id,
            "content": self.content,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class Summary(Base):
    __tablename__ = "summaries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    meeting_id = Column(String, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, unique=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    meeting = relationship("Meeting", back_populates="summary")

    def to_dict(self):
        return {
            "id": self.id,
            "meeting_id": self.meeting_id,
            "content": self.content,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class ActionItem(Base):
    __tablename__ = "action_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    meeting_id = Column(String, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    person = Column(String, nullable=True)
    task = Column(Text, nullable=False)
    deadline = Column(String, nullable=True)
    status = Column(String, nullable=False, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    meeting = relationship("Meeting", back_populates="action_items")

    def to_dict(self):
        return {
            "id": self.id,
            "meeting_id": self.meeting_id,
            "person": self.person,
            "task": self.task,
            "deadline": self.deadline,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class Decision(Base):
    __tablename__ = "decisions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    meeting_id = Column(String, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    meeting = relationship("Meeting", back_populates="decisions")

    def to_dict(self):
        return {
            "id": self.id,
            "meeting_id": self.meeting_id,
            "content": self.content,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class Deadline(Base):
    __tablename__ = "deadlines"

    id = Column(Integer, primary_key=True, autoincrement=True)
    meeting_id = Column(String, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    task = Column(Text, nullable=False)
    deadline = Column(String, nullable=False)
    person = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    meeting = relationship("Meeting", back_populates="deadlines")

    def to_dict(self):
        return {
            "id": self.id,
            "meeting_id": self.meeting_id,
            "task": self.task,
            "deadline": self.deadline,
            "person": self.person,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class Risk(Base):
    __tablename__ = "risks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    meeting_id = Column(String, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    meeting = relationship("Meeting", back_populates="risks")

    def to_dict(self):
        return {
            "id": self.id,
            "meeting_id": self.meeting_id,
            "content": self.content,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class FollowUpTopic(Base):
    __tablename__ = "follow_up_topics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    meeting_id = Column(String, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    topic = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    meeting = relationship("Meeting", back_populates="follow_up_topics")

    def to_dict(self):
        return {
            "id": self.id,
            "meeting_id": self.meeting_id,
            "topic": self.topic,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
