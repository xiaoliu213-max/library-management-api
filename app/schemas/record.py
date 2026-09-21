from datetime import datetime

from pydantic import Field

from .base import StrictBase


class BorrowRecordIn(StrictBase):
    borrower:str=Field(min_length=1,max_length=100)
    note:str|None=Field(default=None,min_length=1,max_length=100)


class BorrowRecordOut(StrictBase):
    id :int
    borrower:str
    note:str|None=None
    borrowed_at: datetime
    returned: bool
