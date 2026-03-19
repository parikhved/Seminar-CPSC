from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import LoginRequest, LoginResponse

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

DEMO_PASSWORD = "demo123"


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email or password is incorrect. Please try again.",
        )

    # Accept the demo password OR the stored password value for Sprint 1
    password_valid = (
        payload.password == DEMO_PASSWORD or payload.password == user.password
    )
    if not password_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email or password is incorrect. Please try again.",
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
