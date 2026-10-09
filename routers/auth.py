from fastapi import Depends,APIRouter,HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session
from database import get_db
import models_db
from  schemas import TokenOut
from security import verify_password, create_access_token

router=APIRouter(prefix="",tags=["auth"])



@router.post("/login",response_model=TokenOut)
async def login(form:OAuth2PasswordRequestForm = Depends(),db:Session = Depends(get_db)):
    #1按用户名查找用户
    user=db.scalars(
        select(models_db.User).where(models_db.User.username==form.username)
    ).first()

    #2用户不存在 或 密码错误 返回同一个错误
    if user is None or not verify_password(form.password,user.hashed_password):
        raise HTTPException(status_code=401,detail="用户名或密码错误")

    #3 账号被禁用
    if not user.is_active:
        raise HTTPException(status_code=403,detail="用户已被禁用")

    #4 签发token

    token=create_access_token(user.id,user.username)

    return {"access_token":token,"token_type":"bearer"}
