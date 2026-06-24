from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordRequestForm
from app.models.user import UserCreate, UserResponse, Token
from app.database import users_collection
from app.utils.security import get_password_hash, verify_password, create_access_token

router = APIRouter()

@router.post("/signup", response_model=UserResponse)
async def signup(user: UserCreate):
    
    existing_user = await users_collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    
    hashed_password = get_password_hash(user.password)
    
    user_dict = user.dict()
    user_dict["password"] = hashed_password

    new_user = await users_collection.insert_one(user_dict)
    
    
    return {
        "id": str(new_user.inserted_id),
        "email": user.email,
        "role": user.role
    }

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    
    user = await users_collection.find_one({"email": form_data.username})
    
    if not user or not verify_password(form_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    access_token = create_access_token(
        data={"sub": user["email"], "role": user["role"]}
    )
    
    return {"access_token": access_token, "token_type": "bearer"}