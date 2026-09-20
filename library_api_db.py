from fastapi import Depends,HTTPException,FastAPI
from pydantic import BaseModel,ConfigDict,Field
from sqlalchemy import or_,select
from sqlalchemy.orm import Session

from database import get_db
import models_db 

#设置pydantic 模型

class Base(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True
    )

class BookFlat(Base):
    title: str = Field(min_length=1,max_length=100)
    author:str = Field(min_length=1,max_length=20)
    price:int = Field(ge=1,le=100)
    first_published:int = Field(ge=1000,le=2100)
    reprint_year: int|None=None


class BookIn(BookFlat):

    publisher_name: str = Field(min_length=1, max_length=100)   # ← 新增
    category_name: str = Field(min_length=1, max_length=30)     # ← 新增
    tag_names: list[str] = []                                   # ← 新增
    translator_names: list[str] = []




class BookPatch(Base):
    title: str |None= Field(default=None,min_length=1, max_length=100)
    author: str |None= Field(default=None,min_length=1, max_length=20)
    price: int |None= Field(default=None,ge=1, le=100)
    first_published: int|None = Field(default=None,ge=1000, le=2100)
    reprint_year: int | None = None


#Out模型
class PublisherOut(Base):
    name:str
    city:str|None=None


class TagOut(Base):
    name:str

class CategoryOut(Base):
    name:str

class TranslatorOut(Base):
    name:str

class BookOut(Base):
    id :int
    title: str
    author:str
    price:int
    first_published:int
    reprint_year: int|None=None
    publisher: PublisherOut
    tags:list[TagOut]
    category:CategoryOut
    translators:list[TranslatorOut]


def get_or_create(db, model, name, **extra):
    """查得到就复用，查不到就新建（先 add，不 commit）"""
    obj=db.scalars(select(model).where(model.name==name)).first()
    if obj is None:
        obj=model(name=name,**extra)
        db.add(obj)
    return obj


app=FastAPI()


#设置依赖函数
def get_book_or_404(book_id:int,db:Session=Depends(get_db)):

    book=db.get(models_db.Book,book_id)
    if book is None:
        raise HTTPException(status_code=404,detail="Book not found")
    return book


@app.post("/books",tags=["books"],response_model=BookOut,status_code=201)
def create_book(book_in:BookIn,db:Session=Depends(get_db)):
    publisher=get_or_create(db,models_db.Publisher,book_in.publisher_name,city=None)
    category=get_or_create(db,models_db.Category,book_in.category_name)
    tags=[get_or_create(db,models_db.Tag,n) for n in book_in.tag_names]
    translators=[get_or_create(db,models_db.Translator,n) for n in book_in.translator_names]
    #组装
    book=models_db.Book(
        title=book_in.title, author=book_in.author, price=book_in.price,
        first_published=book_in.first_published, reprint_year=book_in.reprint_year,
        publisher=publisher, category=category,
        tags=tags, translators=translators,
    )

    db.add(book)
    db.commit()
    db.refresh(book)
    return book

@app.get("/books/{book_id}",response_model=BookOut,status_code=200)
def read_book(book:models_db.Book=Depends(get_book_or_404)):

    return book

@app.get("/books",response_model=list[BookOut],status_code=200)
def select_book(keyword:str="",db:Session=Depends(get_db)):
    stmt=select(models_db.Book)
    if keyword:
        stmt=stmt.where(
            or_(
                models_db.Book.title.contains(keyword),
                models_db.Book.author.contains(keyword)
            )
        )
    return db.scalars(stmt).all()






@app.put("/books/{book_id}",response_model=BookOut,status_code=200)
def update_book(book_in:BookFlat,book:models_db.Book=Depends(get_book_or_404),db:Session=Depends(get_db)):
    book.title=book_in.title
    book.author=book_in.author
    book.price=book_in.price
    book.first_published=book_in.first_published
    book.reprint_year=book_in.reprint_year
    db.commit()
    db.refresh(book)
    return book

@app.patch("/books/{book_id}",response_model=BookOut,status_code=200)
def patch_book(book_in:BookPatch,db:Session =Depends(get_db),book=Depends(get_book_or_404)):
    if book_in.title is not None:
        book.title=book_in.title
    if book_in.author is not None:
        book.author=book_in.author
    if book_in.price is not None:
        book.price=book_in.price
    if book_in.first_published is not None:
        book.first_published=book_in.first_published
    if book_in.reprint_year is not None:
        book.reprint_year=book_in.reprint_year
    db.commit()
    db.refresh(book)
    return book

@app.delete("/books/{book_id}",status_code=204)
def delete_book(db:Session=Depends(get_db),book:models_db.Book=Depends(get_book_or_404)):
    db.delete(book)
    db.commit()

