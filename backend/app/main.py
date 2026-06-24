from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import orders, menu, auth, payments
from app.database import menu_collection, users_collection
from app.utils.security import get_password_hash

app = FastAPI(title="Smart Canteen API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://smart-campus-canteen.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,     prefix="/api/auth",     tags=["Authentication"])
app.include_router(orders.router,   prefix="/api/orders",   tags=["Orders"])
app.include_router(menu.router,     prefix="/api/menu",     tags=["Menu"])
app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])

# 12 sample menu items seeded on first startup
SAMPLE_MENU = [
    {"item_name": "Masala Dosa",     "price": 50,  "category": "Breakfast",  "is_available": True,  "preparation_time": 10},
    {"item_name": "Idli (2 pcs)",    "price": 30,  "category": "Breakfast",  "is_available": True,  "preparation_time": 5},
    {"item_name": "Poori (2 pcs)",   "price": 40,  "category": "Breakfast",  "is_available": True,  "preparation_time": 8},
    {"item_name": "Chicken Biryani", "price": 120, "category": "Lunch",      "is_available": True,  "preparation_time": 20},
    {"item_name": "Veg Biryani",     "price": 90,  "category": "Lunch",      "is_available": True,  "preparation_time": 15},
    {"item_name": "Meals (Full)",    "price": 80,  "category": "Lunch",      "is_available": True,  "preparation_time": 5},
    {"item_name": "Samosa (2 pcs)",  "price": 25,  "category": "Snacks",     "is_available": True,  "preparation_time": 3},
    {"item_name": "Vada (2 pcs)",    "price": 20,  "category": "Snacks",     "is_available": True,  "preparation_time": 5},
    {"item_name": "Bread Omelette",  "price": 35,  "category": "Snacks",     "is_available": False, "preparation_time": 8},
    {"item_name": "Tea",             "price": 15,  "category": "Beverages",  "is_available": True,  "preparation_time": 3},
    {"item_name": "Coffee",          "price": 20,  "category": "Beverages",  "is_available": True,  "preparation_time": 3},
    {"item_name": "Fresh Juice",     "price": 30,  "category": "Beverages",  "is_available": True,  "preparation_time": 5},
    {"item_name": "Fried Rice",      "price": 60,  "category": "Lunch",      "is_available": True,  "preparation_time": 10},
    {"item_name": "French Fries",    "price": 40,  "category": "Snacks",     "is_available": True,  "preparation_time": 5},
    {"item_name": "Cold Drinks",     "price": 20,  "category": "Beverages",  "is_available": True,  "preparation_time": 3},
    {"item_name": "Dosa",            "price": 20,  "category": "Breakfast",  "is_available": True,  "preparation_time": 10},
    {"item_name": "Pongal",          "price": 30,  "category": "Breakfast",  "is_available": True,  "preparation_time": 15},
    {"item_name": "Upma",            "price": 25,  "category": "Breakfast",  "is_available": True,  "preparation_time": 10},
    {"item_name": "Chicken Curry",   "price": 100, "category": "Lunch",      "is_available": True,  "preparation_time": 20},
    {"item_name": "Paneer Butter Masala", "price": 90,  "category": "Lunch", "is_available": True,  "preparation_time": 15},
    {"item_name": "Veg Pulao",       "price": 70,  "category": "Lunch",      "is_available": True,  "preparation_time": 10},
    {"item_name": "Chicken 65",      "price": 80,  "category": "Snacks",     "is_available": True,  "preparation_time": 10},
    {"item_name": "Mutton Biryani",  "price": 150, "category": "Lunch",      "is_available": True,  "preparation_time": 25},
    {"item_name": "Veg Sandwich",    "price": 50,  "category": "Snacks",     "is_available": True,  "preparation_time": 5},
    {"item_name": "Chicken Sandwich", "price": 70,  "category": "Snacks",    "is_available": True,  "preparation_time": 5},
    {"item_name": "Mango Lassi",     "price": 40,  "category": "Beverages",  "is_available": True,  "preparation_time": 5},
    {"item_name": "Masala Chai",     "price": 15,  "category": "Beverages",  "is_available": True,  "preparation_time": 3},
    {"item_name": "Veg Cutlet",      "price": 30,  "category": "Snacks",     "is_available": True,  "preparation_time": 5},
    {"item_name": "Chicken Cutlet",  "price": 50,  "category": "Snacks",     "is_available": True,  "preparation_time": 5},
    {"item_name": "Egg Curry",       "price": 60,  "category": "Lunch",      "is_available": True,  "preparation_time": 15},
    {"item_name": "Veg Fried Rice",  "price": 50,  "category": "Lunch",      "is_available": True,  "preparation_time": 10},
    {"item_name": "Chicken Noodles", "price": 80,  "category": "Lunch",      "is_available": True,  "preparation_time": 15},
    {"item_name": "Veg Noodles",     "price": 60,  "category": "Lunch",      "is_available": True,  "preparation_time": 10},
    {"item_name": "Paneer Tikka",    "price": 90,  "category": "Snacks",     "is_available": True,  "preparation_time": 10},
    {"item_name": "Chicken Tikka",   "price": 120, "category": "Snacks",     "is_available": True,  "preparation_time": 10},
    {"item_name": "Veg Burger",      "price": 50,  "category": "Snacks",     "is_available": True,  "preparation_time": 5},
    {"item_name": "Chicken Burger",  "price": 70,  "category": "Snacks",     "is_available": True,  "preparation_time": 5},
    {"item_name": "Veg Pizza",       "price": 100, "category": "Snacks",     "is_available": True,  "preparation_time": 15},
    {"item_name":"Parotta",          "price": 30,  "category": "Breakfast",  "is_available": True,  "preparation_time": 10},
    {"item_name":"Watermelon Juice", "price": 25,  "category": "Beverages",  "is_available": True,  "preparation_time": 5},
    {"item_name":"Lemonade",         "price": 20,  "category": "Beverages",  "is_available": True,  "preparation_time": 3},
    {"item_name":"Cucumber Sandwich","price": 40,  "category": "Snacks",     "is_available": True,  "preparation_time": 5},
    {"item_name":"Tomato Soup",      "price": 30,  "category": "Snacks",     "is_available": True,  "preparation_time": 5},
    {"item_name":"Mushroom Soup",    "price": 35,  "category": "Snacks",     "is_available": True,  "preparation_time": 5},
    {"item_name":"Veg Wrap",         "price": 60,  "category": "Snacks",     "is_available": True,  "preparation_time": 5},
    {"item_name":"Chicken Wrap",     "price": 80,  "category": "Snacks",     "is_available": True,  "preparation_time": 5},
    {"item_name":"Paneer Wrap",      "price": 70,  "category": "Snacks",     "is_available": True,  "preparation_time": 5},
    {"item_name":"Veg Salad",        "price": 50,  "category": "Snacks",     "is_available": True,  "preparation_time": 5},
    {"item_name":"Chicken Salad",    "price": 70,  "category": "Snacks",     "is_available": True,  "preparation_time": 5},
    {"item_name":"Fruit Salad",      "price": 60,  "category": "Snacks",     "is_available": True,  "preparation_time": 5}
]
@app.on_event("startup")
async def seed_data():
    # Seed menu only if collection is empty
    count = await menu_collection.count_documents({})
    if count == 0:
        await menu_collection.insert_many(SAMPLE_MENU)
        print("✅ 50 sample menu items seeded")

    # Create default admin account if not present
    admin = await users_collection.find_one({"email": "admin@canteen.com"})
    if not admin:
        await users_collection.insert_one({
            "email": "admin@canteen.com",
            "password": get_password_hash("admin123"),
            "role": "admin",
        })
        print("✅ Default admin created — admin@canteen.com / admin123")