from fastapi import FastAPI,HTTPException

from pydantic import BaseModel,Field


app= FastAPI()

class TaskOut(BaseModel):
    id:int
    name:str = Field(max_length=50,min_length=1)
    gender: str=Field(description="性别")
    age: int=Field(ge=0,le=150)



class Tasks(BaseModel):
    name:str = Field(max_length=50,min_length=1)
    gender: str=Field(description="性别")
    age: int=Field(ge=0,le=150)

class Tasks_Patch(BaseModel):
    name:str|None=None
    gender: str|None=None
    age: int|None= None

tasks=[
    {
        "id":1,
        "gender":"male",
        "name":"pankeke",
        "age":120
    },
    {
        "id":2,
        "name":"liusihan",
        "gender":"male",
        "age":18
    }
]




#查询参数

@app.get("/tasks",response_model=list[TaskOut])
async def list_tasks(keywords:str=""):
    if not keywords:
        return tasks
    else:
        result=[]
        for task in tasks:
            if keywords in task["name"]:
                result.append(task)
        return result


#路径参数

@app.get("/tasks/{id}",response_model=TaskOut)
async def get_task(id:int):
    for task in tasks:
        if task["id"] == id:
            return task

    raise HTTPException(status_code=404,detail="查询不到次id")


@app.post("/tasks",response_model=TaskOut,status_code=201)
async def create_task(task:Tasks):
    new_task ={}
    #先找最大值id，推荐列表推导式
    max_id=max([item["id"] for item in tasks], default=0)
    id=max_id+1

    #添加任务
    new_task["id"]=id
    new_task["name"]=task.name
    new_task["gender"]=task.gender
    new_task["age"]=task.age

    #添加到任务列表中
    tasks.append(new_task)

    return TaskOut(**new_task)


@app.put("/tasks/{id}",response_model=TaskOut)
async def update_task(id:int,task:Tasks):
    for item in tasks:
        if item["id"] == id:
            item["gender"] = task.gender
            item["age"]=task.age
            item["name"]=task.name
            return TaskOut(**item)
    raise HTTPException(status_code=404,detail="无此id")


@app.patch("/tasks/{id}",response_model=TaskOut)
async def patch_task(id:int,task:Tasks_Patch):
    for item in tasks:
        if item["id"] == id:
            if task.gender is not None:
                item["gender"]=task.gender
            if task.age is not None:
                item["age"]=task.age
            if task.name is not None:
                item["name"]=task.name
            return TaskOut(**item)
    raise HTTPException(status_code=404,detail="无此id")



#用remove删除
@app.delete("/tasks/{id}",status_code=204)
async def delete_task(id:int):
    for item in tasks:
        if item["id"] == id:
            tasks.remove(item)
            return
    raise HTTPException(status_code=404,detail="无此id")