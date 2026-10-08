from datetime import datetime

from sqlalchemy import String, Column,Table,ForeignKey,DateTime,Boolean
from sqlalchemy.orm import Mapped,mapped_column,relationship
from  database import Base



class Publisher(Base):
    __tablename__="publishers"
    id :Mapped[int]=mapped_column(primary_key=True,autoincrement=True)
    name :Mapped[str]=mapped_column(String(100),unique=True)
    city :Mapped[str|None]=mapped_column(String(100),default=None)
    books :Mapped[list["Book"]]=relationship(back_populates="publisher")#反向导航

#Tags与Book对应的中间表
book_tags=Table(
    "book_tags",#表名
    Base.metadata,#挂到Base上
Column("book_id",ForeignKey("books.id"),primary_key=True),#外键列1
     Column("tag_id",ForeignKey("tags.id"),primary_key=True),#外键列2
)

class Tag(Base):
    __tablename__="tags"
    id :Mapped[int]=mapped_column(primary_key=True,autoincrement=True)
    name :Mapped[str]=mapped_column(String(100),unique=True)

    books:Mapped[list["Book"]]=relationship(back_populates="tags",secondary=book_tags)



book_translators=Table(
    "book_translators",Base.metadata,
    Column("book_id",ForeignKey("books.id"),primary_key=True),
    Column("translator_id",ForeignKey("translators.id"),primary_key=True),
)




class  Book(Base):
    #表名
    __tablename__="books"

    id :Mapped[int]=mapped_column(primary_key=True,autoincrement=True)
    title :Mapped[str]=mapped_column(String(100))
    author :Mapped[str]=mapped_column(String(50))
    price :Mapped[int]
    first_published:Mapped[int]
    reprint_year:Mapped[int|None]=mapped_column(default=None)

    # models_db.py → class Book 里
    isbn: Mapped[str | None] = mapped_column(String(20), default=None)

    #外键
    publisher_id:Mapped[int]=mapped_column(ForeignKey("publishers.id")) #外键列
    publisher:Mapped["Publisher"]=relationship(back_populates="books") #导航

    tags:Mapped[list["Tag"]]=relationship(back_populates="books",secondary=book_tags)

    records:Mapped[list["BorrowRecord"]]=relationship(back_populates="book")

    category_id:Mapped[int]=mapped_column(ForeignKey("categories.id"))
    category:Mapped["Category"]=relationship(back_populates="books")

    translators:Mapped[list["Translator"]]=relationship(back_populates="books",secondary=book_translators)


class BorrowRecord(Base):
    __tablename__="borrow_records"


    id :Mapped[int]=mapped_column(primary_key=True,autoincrement=True)
    borrower:Mapped[str]=mapped_column(String(100))
    borrowed_at:Mapped[datetime]=mapped_column(DateTime,default=datetime.now)
    returned: Mapped[bool] = mapped_column(Boolean, default=False)
    note: Mapped[str | None] = mapped_column(String(100), default=None)
    #外键
    book_id: Mapped[int] = mapped_column(ForeignKey("books.id"))

    book: Mapped["Book"] = relationship(back_populates="records")  # ③ 导航


#分类
class Category(Base):
    __tablename__="categories"

    id :Mapped[int]=mapped_column(primary_key=True,autoincrement=True)
    name :Mapped[str]=mapped_column(String(30),unique=True)

    books:Mapped[list["Book"]]=relationship(back_populates="category")




class Translator(Base):
    __tablename__="translators"
    id :Mapped[int]=mapped_column(primary_key=True,autoincrement=True)
    name :Mapped[str]=mapped_column(String(50),unique=True)
    books:Mapped[list["Book"]]=relationship(back_populates="translators",secondary=book_translators)

class User(Base):
    __tablename__="users"

    id:Mapped[int]=mapped_column(primary_key=True,autoincrement=True)
    username:Mapped[str]=mapped_column(String(100),unique=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)