
from fastapi import Depends
from sqlalchemy import or_,select
from sqlalchemy.orm import Session
from database import get_db
import models_db
from dependencies import get_book_or_404
from crud import get_or_create
from  schemas import BookFlat,BookIn,BookOut,BookPatch
from fastapi import APIRouter



router = APIRouter(prefix="/books", tags=["books"])


@router.post("",response_model=BookOut,status_code=201)
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





@router.get("/{book_id}/",response_model=BookOut,status_code=200)
def read_book(book:models_db.Book=Depends(get_book_or_404)):

    return book

@router.get("",response_model=list[BookOut],status_code=200)
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






@router.put("/{book_id}",response_model=BookOut,status_code=200)
def update_book(book_in:BookFlat,book:models_db.Book=Depends(get_book_or_404),db:Session=Depends(get_db)):
    book.title=book_in.title
    book.author=book_in.author
    book.price=book_in.price
    book.first_published=book_in.first_published
    book.reprint_year=book_in.reprint_year
    db.commit()
    db.refresh(book)
    return book


@router.patch("/{book_id}",response_model=BookOut,status_code=200)
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

@router.delete("/{book_id}",status_code=204)
def delete_book(db:Session=Depends(get_db),book:models_db.Book=Depends(get_book_or_404)):
    db.delete(book)
    db.commit()
