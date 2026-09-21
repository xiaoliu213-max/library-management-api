import os
from dotenv import load_dotenv


load_dotenv()  #读项目根目录的.env

print("db_user=",os.getenv("db_user"))
print("db_password=",os.getenv("db_password"))
print("db_host=",os.getenv("db_host"))
print("db_port=",os.getenv("db_port"))
print("db_name=",os.getenv("db_name"))