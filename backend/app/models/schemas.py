from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, EmailStr

class UserRegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class UserLoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class SummarizeRequest(BaseModel):
    transcript: Optional[str] = None
    meeting_id: Optional[str] = None

class ActionItemsRequest(BaseModel):
    transcript: Optional[str] = None
    meeting_id: Optional[str] = None

class QuestionRequest(BaseModel):
    question: str
    meeting_id: Optional[str] = None

class ActionItemSchema(BaseModel):
    id: Optional[int] = None
    meeting_id: Optional[str] = None
    person: Optional[str] = None
    task: str
    deadline: Optional[str] = None
    status: str = "pending"
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class DecisionSchema(BaseModel):
    id: Optional[int] = None
    meeting_id: Optional[str] = None
    content: str
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class TranscriptSchema(BaseModel):
    id: Optional[int] = None
    meeting_id: Optional[str] = None
    content: str
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class SummarySchema(BaseModel):
    id: Optional[int] = None
    meeting_id: Optional[str] = None
    content: str
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class MeetingResponse(BaseModel):
    id: str
    filename: str
    status: str
    user_id: Optional[str] = None
    created_at: Optional[datetime] = None
    transcript: Optional[str] = None
    summary: Optional[str] = None
    action_items: List[ActionItemSchema] = []
    decisions: List[DecisionSchema] = []

    model_config = ConfigDict(from_attributes=True)
