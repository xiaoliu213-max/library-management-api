from fastapi import Depends,APIRouter,Query,HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from database import get_db
import models_db
from  schemas import UserOut,UserIn
from security import hash_password,verify_password


router = APIRouter(prefix="/users",tags=["users"])

@router.post("",response_model=UserOut,status_code=201)
def create_user(user_in: UserIn,db: Session = Depends(get_db)):

    #检查用户名是否已经存在
    exists=db.scalars(
        select(models_db.User).where(models_db.User.username==user_in.username)

    ).first()

    if exists:
        raise HTTPException(status_code=409,detail="用户名已经存在")
    #
    #哈希密码
    #创建一个对象
    user=models_db.User(
        username=user_in.username,
        hashed_password= hash_password(user_in.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user



