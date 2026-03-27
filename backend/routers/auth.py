from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import LoginRequest, LoginResponse

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

DEMO_PASSWORD = "demo123"


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    normalized_email = payload.email.strip().lower()
    normalized_password = payload.password.strip()

    user = db.query(User).filter(User.email == normalized_email).first()
    any_user_exists = db.query(User.userID).first() is not None

    if not any_user_exists:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
        )

    if user:
        password_valid = (
            normalized_password == DEMO_PASSWORD
            or normalized_password == user.password
        )
        if not password_valid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email or Password is incorrect.",
            )

    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email or Password is incorrect.",
        )

    if user.role != "Manager":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to CPSC Managers for Sprint 1.",
        )

    token = f"sprint1-token-{user.userID}-{user.email}"

    return LoginResponse(
        userID=user.userID,
        firstName=user.firstName,
        lastName=user.lastName,
        email=user.email,
        role=user.role,
        token=token,
    )
