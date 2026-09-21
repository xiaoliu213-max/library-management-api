from database import engine,SessionLocal,Base
from sqlalchemy import select
import models_db

Base.metadata.create_all(bind=engine)
#获取一个事物会话
db=SessionLocal()
try:
    b=models_db.Book(title="三体", author="liusihan", price=30,first_published=2008)
    db.add(b)
    db.commit()
    db.refresh(b)
    print("新书id=",b.id)
    for x in db.scalars(select(models_db.Book)).all():
        print(x.id,x.title,x.author,x.price)
finally:
    db.close()
