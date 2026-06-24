from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: str = "student" 


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    role: str

class Token(BaseModel):
    access_token: str
    token_type: str