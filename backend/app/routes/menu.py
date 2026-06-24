from fastapi import APIRouter, HTTPException
from typing import List
from bson import ObjectId
from app.models.menu import MenuItemCreate, MenuItemResponse
from app.database import menu_collection

router = APIRouter()


@router.get("/", response_model=List[MenuItemResponse])
async def get_menu():
    """Return all menu items."""
    items = await menu_collection.find({}).to_list(100)
    for item in items:
        item["id"] = str(item.pop("_id"))
    return items


@router.post("/")
async def add_menu_item(item: MenuItemCreate):
    """Admin: add a new menu item."""
    item_dict = item.dict()
    new_item = await menu_collection.insert_one(item_dict)
    return {"message": "Menu item added successfully", "id": str(new_item.inserted_id)}


@router.put("/{item_id}/availability")
async def update_availability(item_id: str, is_available: bool):
    """Admin: toggle item availability (in stock / out of stock)."""
    try:
        result = await menu_collection.update_one(
            {"_id": ObjectId(item_id)},
            {"$set": {"is_available": is_available}},
        )
        if result.modified_count == 1:
            return {"message": f"Availability updated to {is_available}"}
        raise HTTPException(status_code=404, detail="Item not found")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Item ID")


@router.put("/{item_id}")
async def update_menu_item(item_id: str, item: MenuItemCreate):
    """Admin: edit an existing menu item (name, price, category, availability)."""
    try:
        result = await menu_collection.update_one(
            {"_id": ObjectId(item_id)},
            {"$set": item.dict()},
        )
        if result.modified_count == 1:
            return {"message": "Menu item updated successfully"}
        raise HTTPException(status_code=404, detail="Item not found")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Item ID")


@router.delete("/{item_id}")
async def delete_menu_item(item_id: str):
    """Admin: remove a menu item."""
    try:
        result = await menu_collection.delete_one({"_id": ObjectId(item_id)})
        if result.deleted_count == 1:
            return {"message": "Menu item deleted"}
        raise HTTPException(status_code=404, detail="Item not found")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Item ID")