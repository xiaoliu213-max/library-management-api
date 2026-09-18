from datetime import datetime
from fastapi import Depends
from fastapi import HTTPException,FastAPI
from pydantic import BaseModel, Field, field_validator, model_validator,ConfigDict
import time

app=FastAPI()


#定义模型

class Publisher(BaseModel):
    model_config = ConfigDict(extra="forbid",str_strip_whitespace=True )

    name:str=Field(max_length=30,min_length=1)
    city:str|None=Field(default=None,max_length=30,min_length=1)



class BookBase(BaseModel):
    #模型约束
    model_config = ConfigDict(extra="forbid",#多传字段直接422
                              str_strip_whitespace=True #所有字符串自动去除收尾空格
                              )

    author: str=Field(max_length=50,min_length=1)
    title: str=Field(max_length=50,min_length=1)
    price: int=Field(ge=1,le=100)
    publisher:Publisher
    tags:list[str]=[]



    @field_validator("tags")
    @classmethod
    def validate_tags(cls, value:list)->list:
        result=[]
        if value is not None:
            for item in value:
                if item not in result:
                    result.append(item)
        return result

#客户端输入模型
class BorrowRecordIn(BaseModel
                   ):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    borrower: str = Field(max_length=30, min_length=1)  # 借阅人


    returned: bool = False  # 是否已经归还

#服务器输出模型
class BorrowRecord(BorrowRecordIn):
    borrowed_at: datetime  # 什么时候借的


class Book(BookBase):

    first_published:int=Field(ge=1000,le=2100)
    reprint_year:int|None=None

    #跨字段验证
    @model_validator(mode="after")
    def check_years(self):
        if self.reprint_year is not None and self.reprint_year<self.first_published:
            raise ValueError("再版年份不能早于出版年份")
        return self






class BookPatch(BookBase):

    author: str|None=None
    title: str|None=None
    price: int|None=Field(default=None,ge=1,le=100)
    publisher:Publisher|None=Field(default=None,description="若提供请整体替换，否则剩下的字段会被清空")

    tags:list[str]| None=None
    first_published: int|None=Field(default=None,ge=1000,le=2100)
    reprint_year: int|None=None

    #从写一下跨字段验证
    @model_validator(mode="after")
    def check_years(self):
        if (self.reprint_year is not None and self.first_published is not None) and self.reprint_year<self.first_published:
            raise ValueError("再版年份不能早于出版年份")
        return self



#设置一下输出包裹
class BookOut(BookBase):
    id :int
    first_published: int
    reprint_year: int|None=None
    records: list[BorrowRecord] = []





library_list=[
    {
        "id": 1,
        "author": "liusihan",
        "title": "nb",
        "price": 1,
        "publisher": {"name": "天津出版社", "city": "天津"},
        "tags": ["liusihan", "nb"],
        "first_published": 1990,
        "reprint_year": 2020,
        "records":[
            {
                "borrower":"liusihan",
                "borrowed_at":"1234",
                "returned":False
            }
        ]
    },
    {
        "id": 2,
        "author": "pankeke",
        "title": "nbnb",
        "price": 2,
        "publisher": {"name": "北京出版社", "city": "北京"},
        "tags": ["哈哈哈哈", "nb"],
        "first_published": 1990,
        "reprint_year": 2020,
        "records": [
            {
                "borrower": "han",
                "borrowed_at": "34",
                "returned": False
            }
        ]
    }

]

#依赖函数
def get_book_or_404(book_id:int)->dict:
    for item in library_list:
        if item["id"] == book_id:
            return item
    raise HTTPException(status_code=404, detail=f'not found {book_id}')


#yield依赖
def log_request():
    start=time.perf_counter()
    print("[计时]请求开始")
    try:
        yield {"start": start}
    finally:
        elapsed = time.perf_counter() - start
        print(f"[计时]请求结束，耗时{elapsed * 1000:.1f}ms")

def get_config()->dict:
    return {"max_records":2}

def get_max_records(config:dict=Depends(get_config))->int:
    return config["max_records"]





@app.get('/books',tags=["books"],response_model=list[BookOut])
async def get_books(keyword:str="",timer=Depends(log_request)):
    if not keyword:
        return library_list
    else:
        new_list = []
        for item in library_list:
            if  keyword in item["title"] or keyword in item["author"] :
                new_list.append(item)
        return new_list


@app.post('/books',tags=["books"],status_code=201,response_model=BookOut)
async def create_book(book:Book):
    id=max([book["id"] for book in library_list],default=0)+1
    new_book = book.model_dump()
    new_book["id"]=id
    new_book["records"]=[]
    library_list.append(new_book)
    return new_book

@app.get('/books/{book_id}',tags=["books"],response_model=BookOut)
async def get_book(timer=Depends(log_request),book=Depends(get_book_or_404)):
    return book

@app.put('/books/{book_id}',tags=["books"],response_model=BookOut)
async def update_book(bookIn:Book,book:dict=Depends(get_book_or_404)):
    book.update(bookIn.model_dump())
    return book



@app.patch('/books/{book_id}',tags=["books"],response_model=BookOut)
async def patch_book(book:BookPatch,item:dict=Depends(get_book_or_404)):
    if book.author is not None:
        item["author"] = book.author
    if book.title is not None:
        item["title"] = book.title
    if book.price is not None:
        item["price"] = book.price
    if book.publisher is not None:
        item["publisher"] = book.publisher.model_dump()
    if book.tags is not None:
        item["tags"] = book.tags
    if book.first_published is not None:
        item["first_published"] = book.first_published
    if book.reprint_year is not None:
        item["reprint_year"] = book.reprint_year
    return item

@app.delete('/books/{book_id}',tags=["books"],status_code=204)
async def delete_book(book:dict=Depends(get_book_or_404)):
    library_list.remove(book)
    return





#借阅图书业务
@app.post('/books/{book_id}/records',tags=["records"],status_code=201,response_model=BookOut)
async def add_record(borrow:BorrowRecordIn,book:dict=Depends(get_book_or_404),count:int=Depends(get_max_records)):
    if len(book["records"]) >= count:
        raise HTTPException(status_code=400, detail="借阅图书已经达到上限")
    records = borrow.model_dump()
    records["borrowed_at"] = datetime.now()
    book["records"].append(records)
    return book
#图书借阅记录查询
@app.get('/books/{book_id}/records',tags=["records"],response_model=list[BorrowRecord])
async def get_record(book:dict=Depends(get_book_or_404)):
    return book["records"]

