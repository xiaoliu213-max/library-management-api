from fastapi import FastAPI
from pydantic import BaseModel

app= FastAPI()

class Task(BaseModel):
    id: int
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
        "age":20
    }
]
@app.get("/task",tags=["task"])
async def list_tasks():
    return {
        'tasks':tasks
    }


@app.post("/task",tags=["task"])
async def create_task():
    return {"message": "World"}


@app.put("/task",tags=["task"])
async def update_task(task:Task):
    if not tasks:
        return {"message": "error"}
    tasks[0]["id"] = task.id
    tasks[0]["age"]=task.age
    tasks[0]["gender"] = task.gender
    return {"message": "World",
            'tasks':tasks}

@app.patch("/task",tags=["task"])
async def patch_task(task:Tasks_Patch):
    if not tasks:
        return {"message": "error"}
    if task.gender is not None:
        tasks[0]["gender"] = task.gender
    if task.age is not None:
        tasks[0]["age"] = task.age
    return {"message": "World",
            'tasks':tasks}

@app.delete('/task',tags=["task"])
async def delete_task():
    tasks.clear()
    return {"message": "World",
            'tasks': tasks}