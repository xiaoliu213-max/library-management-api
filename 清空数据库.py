# 跑一小段 Python
#from database import engine, Base
#import models_db
#Base.metadata.drop_all(bind=engine)








# 临时脚本，跑一次就行
from database import SessionLocal
import models_db as M

db = SessionLocal()
try:
    book = M.Book(
        title="三体", author="刘慈欣", price=30, first_published=2008,
        publisher=M.Publisher(name="人民邮电出版社", city="北京"),
        category=M.Category(name="科幻"),
    )
    db.add(book)
    db.commit()
    print("插入完成，book id =", book.id)
finally:
    db.close()