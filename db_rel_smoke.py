
from sqlalchemy import select
from database import engine, SessionLocal, Base
import models_db as M

Base.metadata.drop_all(bind=engine)      # ⚠️ 会清掉 library 库里所有旧表（含你那几本测试书，预期之内）
Base.metadata.create_all(bind=engine)

db = SessionLocal()
try:
    pub = M.Publisher(name="人民邮电出版社", city="北京")
    cat = M.Category(name="科幻")
    t1, t2 = M.Tag(name="科幻小说"), M.Tag(name="中国文学")
    tr1, tr2 = M.Translator(name="张三"), M.Translator(name="李四")

    book = M.Book(title="三体", author="刘慈欣", price=30, first_published=2008,
                  publisher=pub, category=cat, tags=[t1, t2], translators=[tr1, tr2])
    book.records.append(M.BorrowRecord(borrower="小明"))

    db.add(book)          # 只 add 一个
    db.commit()

    b = db.scalars(select(M.Book)).first()
    print("书名:", b.title)
    print("出版社:", b.publisher.name)
    print("分类:", b.category.name)
    print("标签:", [t.name for t in b.tags])
    print("译者:", [t.name for t in b.translators])
    print("借阅记录:", [(r.borrower, r.borrowed_at) for r in b.records])
finally:
    db.close()