from fastapi import HTTPException,FastAPI
from pydantic import BaseModel, Field, field_validator, model_validator,ConfigDict


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





library_list=[
    {
        "id": 1,
        "author": "liusihan",
        "title": "nb",
        "price": 1,
        "publisher": {"name": "天津出版社", "city": "天津"},
        "tags": ["liusihan", "nb"],
        "first_published": 1990,
        "reprint_year": 2020
    },
    {
        "id": 2,
        "author": "pankeke",
        "title": "nbnb",
        "price": 2,
        "publisher": {"name": "北京出版社", "city": "北京"},
        "tags": ["哈哈哈哈", "nb"],
        "first_published": 1990,
        "reprint_year": 2020
    }

]
@app.get('/books',tags=["books"],response_model=list[BookOut])
async def get_books(keyword:str=""):
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
    new_book=book.model_dump()
    new_book["id"]=id
    library_list.append(new_book)
    return new_book

@app.get('/books/{id}',tags=["books"],response_model=BookOut)
async def get_book(id:int):
    for book in library_list:
        if book["id"]==id:
            return book
    raise HTTPException(status_code=404,detail=f'not found {id}')

@app.put('/books/{id}',tags=["books"],response_model=BookOut)
async def update_book(id:int,book:Book):
    #先验证一下是否有这个id
    for item in library_list:
        if item["id"]==id:
            item.update(book.model_dump())
            return item
    raise HTTPException(status_code=404,detail=f'not found {id}')


@app.patch('/books/{id}',tags=["books"],response_model=BookOut)
async def patch_book(id:int,book:BookPatch):
    for item in library_list:
        if item["id"]==id:
            if book.author is not None:
                item["author"]=book.author
            if book.title is not None:
                item["title"]=book.title
            if book.price is not None:
                item["price"]=book.price
            if book.publisher is not None:
                item["publisher"]=book.publisher.model_dump()
            if book.tags  is not None:
                item["tags"]=book.tags
            if book.first_published is not None:
                item["first_published"]=book.first_published
            if book.reprint_year is not None:
                item["reprint_year"]=book.reprint_year
            return item
    raise HTTPException(status_code=404,detail=f'not found {id}')

@app.delete('/books/{id}',tags=["books"],status_code=204)
async def delete_book(id:int):
    for book in library_list:
        if book["id"]==id:
            library_list.remove(book)
            return
    raise HTTPException(status_code=404,detail=f'not found {id}')

