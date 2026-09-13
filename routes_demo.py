from fastapi import FastAPI
from pydantic import BaseModel

app= FastAPI()

class Tasks(BaseModel):
    id: int=11
    gender: str
    age: int

class Tasks_Patch(BaseModel):
    id: int|None= None
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
        "age":18
    }
]


#查询参数
@app.get("/tasks")
async def list_tasks(keywords:str=""):
    if not keywords:
        return {"task":tasks}
    else:
        result=[]
        for task in tasks:
            if keywords in task["name"]:
                result.append(task)
        return result


#路径参数
@app.get("/tasks/{id}")
async def get_task(id:int):
    for task in tasks:
        if task["id"] == id:
            return task

    return{"message": "error"}


@app.post("/tasks")
async def create_task(task:Tasks):
    if not task:
        return {"message": "error"}
    tasks.append(task.model_dump())
    return tasks




@app.put("/tasks/{id}")
async def update_task(id:int,task:Tasks):
    for item in tasks:
        if item["id"] == id:
            item["gender"] = task.gender
            item["age"]=task.age
            return {"message": "World",
                    'tasks':tasks}
    return{"message": "没找到"}


@app.patch("/tasks/{id}")
async def patch_task(id:int,task:Tasks_Patch):
    for item in tasks:
        if item["id"] == id:
            if task.gender is not None:
                item["gender"]=task.gender
            if task.age is not None:
                item["age"]=task.age
            return{"tasks":tasks}
    return {"message": "error"}


#用remove删除
@app.delete("/tasks/{id}")
async def delete_task(id:int):
    for item in tasks:
        if item["id"] == id:
            tasks.remove(item)
            return {"tasks":tasks}
    return {"message": "没有找到"}