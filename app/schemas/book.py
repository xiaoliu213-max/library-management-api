from pydantic import Field

from .base import StrictBase
from .publisher import CategoryOut,PublisherOut,TagOut,TranslatorOut
from .record import BorrowRecordOut


class BookFlat(StrictBase):
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


class BookPatch(StrictBase):
    title: str |None= Field(default=None,min_length=1, max_length=100)
    author: str |None= Field(default=None,min_length=1, max_length=20)
    price: int |None= Field(default=None,ge=1, le=100)
    first_published: int|None = Field(default=None,ge=1000, le=2100)
    reprint_year: int | None = None


class BookOut(StrictBase):
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
