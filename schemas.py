#存放pydantic校验体模型
from pydantic import BaseModel,ConfigDict,Field
from datetime import datetime
from typing import  Generic,TypeVar



#分页模型
T=TypeVar("T")
class Page(BaseModel,Generic[T]):
    total:int
    page:int
    size:int
    items:list[T]




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


class BorrowRecordIn(Base):
    borrower:str=Field(min_length=1,max_length=100)
    note:str|None=Field(default=None,min_length=1,max_length=100)




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




class BorrowRecordOut(Base):
    id :int
    borrower:str
    note:str|None=None
    borrowed_at: datetime
    returned: bool



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
    records:list[BorrowRecordOut]

class UserIn(Base):
    username:str=Field(min_length=3,max_length=50)
    password:str=Field(min_length=6,max_length=128)


class UserOut(Base):
    id:int
    username:str
    is_active: bool
    is_admin: bool


class TokenOut(Base):
    access_token:str
    token_type:str= 'bearer'