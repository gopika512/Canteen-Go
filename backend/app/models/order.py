from pydantic import BaseModel
from typing import Optional, List

class OrderItem(BaseModel):
    item_name: str
    quantity: int
    price: float

class OrderCreate(BaseModel):
    student_name: str
    items: List[OrderItem]
    total_amount: float

class OrderResponse(OrderCreate):
    id: str
    token_number: int
    status: str # "pending", "preparing", "ready", "completed"