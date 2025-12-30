# API 使用示例

## 注册

```bash
POST http://localhost:3001/api/auth/register
Content-Type: application/json

{
  "name": "张三",
  "email": "zhangsan@example.com",
  "password": "123456",
  "role": "student",
  "studentId": "2021001",
  "department": "计算机科学系"
}
```

响应：
```json
{
  "message": "注册成功",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "张三",
    "email": "zhangsan@example.com",
    "role": "student",
    "studentId": "2021001",
    "department": "计算机科学系"
  }
}
```

## 登录

```bash
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "email": "zhangsan@example.com",
  "password": "123456"
}
```

响应：
```json
{
  "message": "登录成功",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "张三",
    "email": "zhangsan@example.com",
    "role": "student",
    "studentId": "2021001",
    "department": "计算机科学系"
  }
}
```

## 获取当前用户信息

```bash
GET http://localhost:3001/api/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 修改密码

```bash
PUT http://localhost:3001/api/auth/change-password
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "currentPassword": "123456",
  "newPassword": "newpassword123"
}
```

## 获取所有用户（仅管理员）

```bash
GET http://localhost:3001/api/users
Authorization: Bearer <admin-token>
```

## 获取单个用户信息

```bash
GET http://localhost:3001/api/users/:id
Authorization: Bearer <token>
```

## 更新用户信息

```bash
PUT http://localhost:3001/api/users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "李四",
  "department": "数学系"
}
```

## 角色说明

- **student**: 学生 - 基础用户角色
- **teacher**: 教师 - 教师角色
- **student_representative**: 学生代表 - 学生代表角色
- **teacher_representative**: 教师代表 - 教师代表角色
- **admin**: 管理员 - 拥有所有权限

## 权限说明

- 所有用户都可以注册和登录
- 用户只能查看和修改自己的信息（除非是管理员）
- 只有管理员可以查看所有用户列表
- 只有管理员可以删除用户
- 只有管理员可以修改用户的角色和激活状态

