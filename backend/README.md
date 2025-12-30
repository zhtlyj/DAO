# Backend

DAO 项目的后端 API 服务，使用 Node.js + Express + MongoDB。

## 安装依赖

```bash
npm install
```

## 环境配置

1. 复制 `.env.example` 为 `.env`
2. 配置 MongoDB 连接字符串：
   - 本地 MongoDB: `mongodb://localhost:27017/dao`
   - MongoDB Atlas: `mongodb+srv://username:password@cluster.mongodb.net/dao`

## 启动服务

```bash
npm start
```

## 开发模式（自动重启）

```bash
npm run dev
```

## API 端点

### 基础端点
- `GET /` - 欢迎信息
- `GET /api/health` - 健康检查（包含数据库连接状态）

### 认证相关（无需token）
- `POST /api/auth/register` - 用户注册
  - Body: `{ name, email, password, role, studentId?, department? }`
  - 角色: `student`, `teacher`, `student_representative`, `teacher_representative`, `admin`
- `POST /api/auth/login` - 用户登录
  - Body: `{ email, password }`
  - 返回: `{ token, user }`

### 认证相关（需要token）
- `GET /api/auth/me` - 获取当前用户信息
- `PUT /api/auth/change-password` - 修改密码
  - Body: `{ currentPassword, newPassword }`

### 用户管理（需要token）
- `GET /api/users` - 获取所有用户（仅管理员）
- `GET /api/users/:id` - 根据 ID 获取用户（自己或管理员）
- `PUT /api/users/:id` - 更新用户（自己或管理员）
- `DELETE /api/users/:id` - 删除用户（仅管理员）

## 用户角色

系统支持以下五种角色：
- `student` - 学生
- `teacher` - 教师
- `student_representative` - 学生代表
- `teacher_representative` - 教师代表
- `admin` - 管理员

## 认证说明

大部分 API 端点需要 JWT token 认证。在请求头中添加：
```
Authorization: Bearer <your-token>
```

## 数据库

- 使用 MongoDB + Mongoose
- 默认数据库名：`dao`
- 连接配置在 `config/database.js`

默认端口：3001

