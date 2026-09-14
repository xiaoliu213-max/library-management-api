from fastapi import HTTPException,FastAPI
from pydantic import BaseModel,Field

app=FastAPI()


#定义模型
class Book(BaseModel):
    author: str=Field(max_length=50,min_length=1)
    title: str=Field(max_length=50,min_length=1)
    price: int=Field(ge=1,le=100)


class Book_patch(BaseModel):
    author: str|None=None
    title: str|None=None
    price: int|None=None


#设置一下输出包裹
class BookOut(BaseModel):
    id :int
    author: str
    title: str
    price: int



library_list=[
    {
        "id":1,
        "author":"liusihan",
        "title":"nb",
        "price":1
    },
    {
        "id": 2,
        "author": "pankeke",
        "title": "nbnb",
        "price": 2
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
    new_book={}
    id=max([book["id"] for book in library_list],default=0)+1
    new_book["id"]=id
    new_book["author"]=book.author
    new_book["title"] = book.title
    new_book["price"] = book.price
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
            item["author"]=book.author
            item["title"]=book.title
            item["price"]=book.price
            return item
    raise HTTPException(status_code=404,detail=f'not found {id}')


@app.patch('/books/{id}',tags=["books"],response_model=BookOut)
async def patch_book(id:int,book:Book_patch):
    for item in library_list:
        if item["id"]==id:
            if book.author is not None:
                item["author"]=book.author
            if book.title is not None:
                item["title"]=book.title
            if book.price is not None:
                item["price"]=book.price
            return item
    raise HTTPException(status_code=404,detail=f'not found {id}')

@app.delete('/books/{id}',tags=["books"],status_code=204)
async def delete_book(id:int):
    for book in library_list:
        if book["id"]==id:
            library_list.remove(book)
            return
    raise HTTPException(status_code=404,detail=f'not found {id}')

