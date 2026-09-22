#搬依赖
from fastapi import Depends,FastAPI,HTTPException
from database import get_db
from sqlalchemy.orm import Session
import models_db



#依赖函数
def get_book_or_404(book_id:int,db:Session=Depends(get_db)):

    book=db.get(models_db.Book,book_id)
    if book is None:
        raise HTTPException(status_code=404,detail="Book not found")
    return book

