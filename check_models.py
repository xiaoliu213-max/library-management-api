import models_db

from sqlalchemy.orm import configure_mappers
from sqlalchemy import inspect
from sqlalchemy.schema import CreateTable
from database import engine


configure_mappers()   #强制sqlalchemy现在检查映射关系
print("映射配置成功")



for t in models_db.Base.metadata.sorted_tables:                     # ③④
    ddl = " ".join(str(CreateTable(t).compile(engine)).split())     # ⑤⑥
    print(f"  {t.name:16} FK={'✓' if 'FOREIGN KEY' in ddl else '✗'} "  # ⑦
          f"UQ={'✓' if 'UNIQUE' in ddl else '✗'}")

for cls in (models_db.Publisher, models_db.Tag, models_db.Book):    # ⑧
    print(f"  {cls.__name__:12} → {[r.key for r in inspect(cls).relationships]}")

