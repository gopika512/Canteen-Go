from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URL)

db = client.canteen_db
orders_collection = db.orders
users_collection = db.users
menu_collection = db.menu
payments_collection = db.payments  