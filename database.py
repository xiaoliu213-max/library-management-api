import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker,DeclarativeBase

load_dotenv()#加载根目录下的env文件

DATABASE_URL = (
    f"mysql+pymysql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}"
    f"@{os.getenv('DB_HOST', 'localhost')}:{os.getenv('DB_PORT', '3306')}"
    f"/{os.getenv('DB_NAME', 'library')}?charset=utf8mb4"

)


engine=create_engine(DATABASE_URL,echo=True)

SessionLocal=sessionmaker(autocommit=False,autoflush=False,bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()