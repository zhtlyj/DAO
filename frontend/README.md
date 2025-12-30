# Frontend

这是一个使用 React + Vite 构建的校园 DAO 治理系统前端项目。

## 功能特性

### 用户认证
- ✅ 用户注册（支持5种角色：学生、教师、学生代表、教师代表、管理员）
- ✅ 用户登录
- ✅ JWT 认证
- ✅ 受保护的路由
- ✅ 角色权限控制

### 用户管理
- ✅ 个人信息管理
- ✅ 头像上传和显示
- ✅ 用户信息编辑
- ✅ 用户下拉菜单

### 导航系统
- ✅ 基于角色的动态导航栏
- ✅ 响应式导航（支持移动端）
- ✅ 统一页面布局

### 界面设计
- ✅ 现代化 UI 设计
- ✅ 响应式布局
- ✅ 校园 DAO 主题风格

## 安装依赖

```bash
npm install
```

## 环境配置

1. 复制 `.env.example` 为 `.env`
2. 配置 API 地址（默认：`http://localhost:3001/api`）

```bash
cp .env.example .env
```

## 开发

```bash
npm start
```

开发服务器将在 `http://localhost:5173` 启动

## 构建

```bash
npm run build
```

## 预览构建结果

```bash
npm run preview
```

## 项目结构

```
src/
├── components/           # 通用组件
│   ├── Avatar.jsx        # 头像组件
│   ├── Avatar.css
│   ├── Layout.jsx        # 页面布局组件
│   ├── Layout.css
│   ├── Navbar.jsx        # 导航栏组件
│   ├── Navbar.css
│   ├── ProtectedRoute.jsx # 路由保护组件
│   └── UserDropdown.jsx  # 用户下拉菜单
│   └── UserDropdown.css
├── context/              # React Context
│   └── AuthContext.jsx   # 认证上下文
├── pages/                # 页面组件
│   ├── Login.jsx         # 登录页面
│   ├── Register.jsx      # 注册页面
│   ├── Home.jsx          # 主页
│   ├── Profile.jsx       # 个人信息管理
│   ├── Auth.css          # 登录注册样式
│   ├── Home.css          # 主页样式
│   └── Profile.css       # 个人信息样式
├── services/             # API 服务
│   └── api.js            # API 请求封装
├── App.jsx              # 主应用组件（路由配置）
└── main.jsx             # 入口文件
```

## 路由

### 公开路由
- `/login` - 登录页面
- `/register` - 注册页面

### 需要认证的路由
- `/` - 主页（控制台）
- `/profile` - 个人信息管理

### 功能模块路由
- `/proposals` - 提案管理（所有用户）
- `/proposals/create` - 提交提案（代表角色和管理员）
- `/voting` - 投票中心（所有用户）
- `/discussion` - 讨论区（所有用户）
- `/governance` - 治理规则（所有用户）

### 管理员路由
- `/admin/users` - 用户管理
- `/admin/statistics` - 数据统计
- `/admin/settings` - 系统设置

## 用户角色

系统支持以下五种角色，不同角色拥有不同的权限：

- **student** - 学生
  - 查看提案、投票、讨论、治理规则
  
- **teacher** - 教师
  - 查看提案、投票、讨论、治理规则
  
- **student_representative** - 学生代表
  - 学生权限 + 提交提案
  
- **teacher_representative** - 教师代表
  - 教师权限 + 提交提案
  
- **admin** - 管理员
  - 所有权限 + 用户管理、数据统计、系统设置

## 技术栈

- **React 18** - UI 框架
- **React Router DOM 6** - 路由管理
- **Axios** - HTTP 请求
- **Vite** - 构建工具

## 组件说明

### Avatar 组件
显示用户头像，支持：
- 自定义头像图片
- 默认头像（基于用户名首字母）
- 根据角色显示不同颜色
- 多种尺寸（small, medium, large）

### Navbar 组件
动态导航栏，根据用户角色显示相应菜单项：
- 自动过滤无权限的菜单
- 当前页面高亮
- 响应式设计（移动端汉堡菜单）
- 管理员菜单特殊标识

### Layout 组件
统一页面布局，包含：
- 系统头部（标题 + 用户菜单）
- 导航栏
- 内容区域

### UserDropdown 组件
用户下拉菜单，包含：
- 用户信息展示
- 个人信息管理入口
- 退出登录功能

## 开发说明

### 环境变量

创建 `.env` 文件：

```env
VITE_API_BASE_URL=http://localhost:3001/api
```

### 启动开发服务器

```bash
npm start
```

### 构建生产版本

```bash
npm run build
```

### 预览构建结果

```bash
npm run preview
```

## 功能模块状态

- ✅ 用户认证系统
- ✅ 个人信息管理
- ✅ 导航系统
- 🚧 提案管理（开发中）
- 🚧 投票系统（开发中）
- 🚧 讨论区（开发中）
- 🚧 治理规则（开发中）
- 🚧 管理员功能（开发中）

