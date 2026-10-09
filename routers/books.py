
from fastapi import Depends,APIRouter,Query,HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from database import get_db
import models_db
from dependencies import get_book_or_404,get_current_user
from crud import get_or_create,paginate
from  schemas import BookFlat,BookIn,BookOut,BookPatch,Page



router = APIRouter(prefix="/books", tags=["books"])


SORTABLE={

    "id": models_db.Book.id,
    "title": models_db.Book.title,
    "author": models_db.Book.author,
    "price": models_db.Book.price,
    "first_published": models_db.Book.first_published,
    "reprint_year": models_db.Book.reprint_year,
}


def apply_sort(stmt,sort:str|None):
    cols=[]
    has_id=False
    if sort:
        for token in sort.split(","):
            token=token.strip()
            if not token:
                continue
            desc=token.startswith("-")
            name=token.lstrip("-")
            col=SORTABLE.get(name)
            if col is None:
                raise HTTPException(status_code=400,detail=f"不支持的排序字段：{name}")
            if name=="id":
                has_id=True

            cols.append(col.desc() if desc else col.asc())
    if not has_id:
        cols.append(models_db.Book.id.asc())
    return stmt.order_by(*cols)




@router.get("/{book_id}",response_model=BookOut,status_code=200)
def read_book(book:models_db.Book=Depends(get_book_or_404)):

    return book


#模糊查询
@router.get("",response_model=Page[BookOut],status_code=200)
def list_books(
            page:int=Query(1,ge=1,description="页码从1开始"),
              size:int=Query(10,ge=1,le=100,description="每页条数，最大 100"),
              keyword:str|None=Query(None,description="按书名或作者模糊搜索"),
              author:str|None=Query(None,description="按作者精确匹配"),
              category:str|None=Query(None,description="按分类名筛选"),
              price_min:int|None=Query(None,ge=0,description="价格下限（含）"),
              price_max:int|None=Query(None,ge=0,description="价格上限（含）"),
              sort:str|None=Query(None,description="排序，逗号分隔，- 表示降序，如 -price,title"),
             db:Session=Depends(get_db)):
    # 积累过滤条件
    conds=[]
    if keyword:
        conds.append(models_db.Book.title.contains(keyword) | models_db.Book.author.contains(keyword))
    if author:
        conds.append(models_db.Book.author==author)
    if category:
        conds.append(models_db.Book.category.has(models_db.Category.name==category))
    if price_min is not None:
        conds.append(models_db.Book.price>=price_min)
    if price_max is not None:
        conds.append(models_db.Book.price<=price_max)

    #组装查询

    stmt = select(models_db.Book)
    if conds:
        stmt = stmt.where(*conds)

        # 3 排序
    stmt = apply_sort(stmt, sort)

        # 4 分页
    total, items = paginate(db, stmt, page, size)

    return {
            "total": total,
            "page": page,
            "size": size,
            "items": items
        }


@router.post("",response_model=BookOut,status_code=201,dependencies=[Depends(get_current_user)])
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



@router.put("/{book_id}",response_model=BookOut,status_code=200,dependencies=[Depends(get_current_user)])
def update_book(book_in:BookFlat,book:models_db.Book=Depends(get_book_or_404),db:Session=Depends(get_db)):
    book.title=book_in.title
    book.author=book_in.author
    book.price=book_in.price
    book.first_published=book_in.first_published
    book.reprint_year=book_in.reprint_year
    db.commit()
    db.refresh(book)
    return book


@router.patch("/{book_id}",response_model=BookOut,status_code=200,dependencies=[Depends(get_current_user)])
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

@router.delete("/{book_id}",status_code=204,dependencies=[Depends(get_current_user)])
def delete_book(db:Session=Depends(get_db),book:models_db.Book=Depends(get_book_or_404)):
    db.delete(book)
    db.commit()
