from datetime import datetime, timedelta, timezone
from pwdlib import PasswordHash
import jwt
from config import settings





#----------------密码哈希------------------


# recommended() 当前返回 Argon2id 配置
password_hash=PasswordHash.recommended()

def hash_password(password:str)->str:
    """把明文密码变成哈希值"""
    return password_hash.hash(password)


def verify_password(password:str, hashed:str)->bool:
    """校验密码（登录时用）"""
    return password_hash.verify(password, hashed)


#--------------jwt------------
ALGORITHM = "HS256"     #算法



def create_access_token(user_id:int,username:str)->str:
    """签发一个jwt(登录成功时调用）"""
    payload={
        "sub":str(user_id),
        "username":str(username),
        "exp":datetime.now(timezone.utc)+
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),#ACCESS_TOKEN_EXPIRE_MINUTES从configs里面读
    }
    return jwt.encode(payload,settings.SECRET_KEY,algorithm=ALGORITHM)

def decode_access_token(token:str)->dict:
    """验证并解码"""
    return jwt.decode(token,settings.SECRET_KEY,algorithms=[ALGORITHM])