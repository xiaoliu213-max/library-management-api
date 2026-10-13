# tests/test_books.py
import os


def test_list_books_empty(client):
    """空库时，GET /v1/books 返回 200，且 total 为 0"""
    # 你的代码
    response = client.get("/v1/books")

    assert response.status_code == 200
    data  = response.json()
    assert data["total"]  == 0


def test_get_book_not_found(client):
    """查不存在的书，返回 404"""
    # 你的代码
    response = client.get("/v1/books/9999")

    assert response.status_code == 404


def test_get_book_invalid_id_type(client):
    """路径参数类型不对（/v1/books/abc），返回 422"""
    # 你的代码
    response = client.get("/v1/books/abc")
    assert response.status_code == 422


def  test_register_user(client):
    """注册新用户并返回201"""
    response=client.post("/v1/users", json={"username": "tester", "password": "Test1234"})
    assert response.status_code == 201

def test_create_book(client,auth_headers):
    """带token创建书，返回201"""
    response=client.post("/v1/books",
                         json={
                             "title": "三体",
                             "author": "刘慈欣",
                             "price": 45.0,
                             "first_published": 2008,
                             "publisher_name": "重庆出版社",
                             "category_name": "科幻",
                         }
                         ,
                         headers=auth_headers)
    assert response.status_code == 201,response.json()



def test_create_book_without_token(client):
    """不带任何 token 去建书"""
    response=client.post("/v1/books",
                         json={
                             "title": "三体",
                             "author": "刘慈欣",
                             "price": 45.0,
                             "first_published": 2008,
                             "publisher_name": "重庆出版社",
                             "category_name": "科幻",
                         })
    assert response.status_code == 401,response.json()


def test_create_book_with_bad_token(client):
    """带一个假 token 去建书"""
    response=client.post("/v1/books",
                         headers={"Authorization": "368735678281"},)
    assert response.status_code == 401,response.json()


def test_delete_book_with_normal_user(client,auth_headers):
    """	普通用户删一本存在的书"""
    #先建一本书
    created=client.post("/v1/books",
                         json={
                             "title": "三体",
                             "author": "刘慈欣",
                             "price": 45.0,
                             "first_published": 2008,
                             "publisher_name": "重庆出版社",
                             "category_name": "科幻",
                         }
                         ,
                         headers=auth_headers)
    assert created.status_code == 201,created.json()
    #再删去
    book_id=created.json()["id"]

    response=client.delete(f"/v1/books/{book_id}",headers=auth_headers)
    assert response.status_code == 403,response.json()





def test_delete_book_as_admin(admin_client):
    """管理员删同一本书"""
    # 先建一本书
    created = admin_client.post("/v1/books",
                          json={
                              "title": "三体",
                              "author": "刘慈欣",
                              "price": 45.0,
                              "first_published": 2008,
                              "publisher_name": "重庆出版社",
                              "category_name": "科幻",
                          }
                        )
    assert created.status_code == 201, created.json()
    book_id=created.json()["id"]
    response=admin_client.delete(f"/v1/books/{book_id}")
    assert response.status_code == 204



def test_delete_book_not_found(admin_client):
    """删一本不存在的书"""
    response=admin_client.delete("/v1/books/9999")
    assert response.status_code == 404,response.json()
