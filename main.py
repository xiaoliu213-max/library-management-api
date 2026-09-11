from fastapi import FastAPI

app = FastAPI()


@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.get("/about")
async def about():
    return {"message": "Hello World",
            "name":"liusihan",
            "age":16,
            "learning":"fastapi"
            }