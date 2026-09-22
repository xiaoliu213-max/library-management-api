from fastapi import FastAPI
from routers import books
from routers import records





app = FastAPI()
app.include_router(books.router)
app.include_router(records.router)


