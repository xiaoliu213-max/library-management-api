from liberary_api import Book, BookPatch

data = {"author": "  刘慈欣  ", "title": "  三体  ", "price": 9,
        "publisher": {"name": "重庆出版社", "city": "重庆"},
        "tags": ["科幻", "科幻"], "first_published": 2008}


b = Book.model_validate(data)                    # 反序列化,此时b是模型
print("1. 去空格了吗:", b.author, "/", b.title)
print("2. 去重了吗:", b.tags)
print("3. model_dump():", b.model_dump())
print("4. exclude_none:", b.model_dump(exclude_none=True))
print("5. include:", b.model_dump(include={"title", "price"}))
print("6. dump_json:", b.model_dump_json()[:80])


p = BookPatch.model_validate({"price": 50})      # 只传一个字段
print("7. 没传的字段:", p.model_dump())
print("8. exclude_unset 只剩传过的:", p.model_dump(exclude_unset=True))