
from sqlalchemy import select,func


def get_or_create(db, model, name, **extra):
    """查得到就复用，查不到就新建（先 add，不 commit）"""
    obj=db.scalars(select(model).where(model.name==name)).first()
    if obj is None:
        obj=model(name=name,**extra)
        db.add(obj)
    return obj



#通用分页函数
def paginate(db,stmt,page:int,size:int) ->tuple[int,list]:

    total=db.scalar(select(func.count()).select_from(stmt.subquery())) or 0

    items=db.scalars(stmt.offset((page-1)*size).limit(size)).all()
    
    return total,items