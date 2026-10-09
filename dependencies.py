#搬依赖
from fastapi import Depends,HTTPException
from database import get_db
from sqlalchemy.orm import Session
import models_db

from fastapi.security import OAuth2PasswordBearer
from security import ALGORITHM
from config import settings
import jwt

#依赖函数
def get_book_or_404(book_id:int,db:Session=Depends(get_db)):

    book=db.get(models_db.Book,book_id)
    if book is None:
        raise HTTPException(status_code=404,detail="Book not found")
    return book

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/v1/login")

def get_current_user(token:str=Depends(oauth2_scheme),db:Session=Depends(get_db)):
    #验签，失败抛出jwt.JWTERRIR的各种子类
    try:
        payload=jwt.decode(token,settings.SECRET_KEY,algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401,detail="token无效或者已过期")

    #用sub查库，（token里面的信息回过时
    user=db.get(models_db.User,int(payload["sub"]))
    if user is None:
        raise HTTPException(status_code=401,detail="用户不存在")

    #禁用检查，
    if not user.is_active:
        raise HTTPException(status_code=403,detail="用户已被禁用")

    return user
