from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from supabase import create_client, Client
from supabase.lib.client_options import ClientOptions
from dotenv import load_dotenv
import os

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    options=ClientOptions(auto_refresh_token=False, persist_session=False),
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role_id: int | None = None
    dept_id: int | None = None

@app.post("/api/register")
def register_user(payload: RegisterRequest):
    try:
        auth_response = supabase.auth.sign_up(
            {
                "email": payload.email,
                "password": payload.password,
            }
        )

        user = getattr(auth_response, "user", None)
        if not user:
            raise HTTPException(status_code=400, detail="Auth signup failed")

        insert_response = supabase.table("users").insert(
            {
                "auth_user_id": user.id,
                "name": payload.name,
                "email": payload.email,
                "role_id": payload.role_id,
                "dept_id": payload.dept_id,
            }
        ).execute()

        return {
            "message": "User created successfully",
            "auth_user_id": user.id,
            "profile": insert_response.data,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))