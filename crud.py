
from sqlalchemy import select


def get_or_create(db, model, name, **extra):
    """查得到就复用，查不到就新建（先 add，不 commit）"""
    obj=db.scalars(select(model).where(model.name==name)).first()
    if obj is None:
        obj=model(name=name,**extra)
        db.add(obj)
    return obj