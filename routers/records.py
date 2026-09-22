
from fastapi import Depends,HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models_db
from dependencies import get_book_or_404
from  schemas import BorrowRecordOut,BorrowRecordIn,BookOut
from fastapi import APIRouter

router=APIRouter(prefix="/books",tags=["records"])




@router.get("/{book_id}/records",response_model=list[BorrowRecordOut],status_code=200)
def get_book_records(book=Depends(get_book_or_404),db:Session=Depends(get_db)):
    if book.reprint_year is  None:
        return []
    return book.records



@router.post("/{book_id}/records",response_model=BookOut,status_code=201)
def read_records(borrow:BorrowRecordIn,
                 book_id:int,
                 book:models_db.Book=Depends(get_book_or_404),
                 db:Session=Depends(get_db)):
    record=models_db.BorrowRecord(
        borrower=borrow.borrower,
        note=borrow.note,
    )
    book.records.append(record)
    db.commit()
    db.refresh(book)
    return book

@router.patch("/{book_id}/records/{record_id}",status_code=200)
def update_record(
        book_id:int,
        record_id:int,
        book=Depends(get_book_or_404),
        db:Session=Depends(get_db)):
    if record_id is None:
        return  {"message":"请输入record_id"}
    for item in book.records:
        if item.id == record_id:
            item.returned=True
            db.commit()
            db.refresh(item)
            return item
    raise HTTPException(status_code=404,deatil=f"没有{record_id}这条记录")