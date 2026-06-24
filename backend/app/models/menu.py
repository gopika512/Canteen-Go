from pydantic import BaseModel
from typing import Optional

class MenuItemCreate(BaseModel):
    item_name: str
    price: float
    category: str = "Main Course" # e.g., Tiffin, Snacks, Drinks
    is_available: bool = True
    preparation_time: int = 5 # In minutes

class MenuItemResponse(MenuItemCreate):
    id: str