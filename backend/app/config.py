import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # Database Settings
    MONGO_URL: str = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", "my-super-secret-canteen-key")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 

    RAZORPAY_KEY_ID: str     = os.getenv("RAZORPAY_KEY_ID",     "rzp_test_PLACEHOLDER")
    RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "PLACEHOLDER_SECRET")

settings = Settings()