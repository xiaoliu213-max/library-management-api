from .base import StrictBase


#Out模型
class PublisherOut(StrictBase):
    name:str
    city:str|None=None


class TagOut(StrictBase):
    name:str

class CategoryOut(StrictBase):
    name:str

class TranslatorOut(StrictBase):
    name:str
