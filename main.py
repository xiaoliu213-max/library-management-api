from fastapi import FastAPI

app=FastAPI()


@app.get("/about")
async def root():
    return {"message": "Hello World",
            "name":"liusihan",
            "age":16,
            "learning":"fatapi"
            }