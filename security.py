#security.py--- 密码哈希
from pwdlib import PasswordHash

# recommended() 当前返回 Argon2id 配置
password_hash=PasswordHash.recommended()

def hash_password(password:str)->str:
    """把明文密码变成哈希值"""
    return password_hash.hash(password)


def verify_password(password:str, hashed:str)->bool:
    """校验密码（登录时用）"""
    return password_hash.verify(password, hashed)