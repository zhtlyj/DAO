# 如何将项目上传到 GitHub

## 已完成 ✅
- ✅ Git 仓库已初始化
- ✅ 已创建 `.gitignore` 文件
- ✅ 已完成初始提交（45个文件）

## 接下来的步骤

### 1. 在 GitHub 上创建新仓库
1. 登录 [GitHub](https://github.com)
2. 点击右上角的 **"+"** 按钮，选择 **"New repository"**
3. 输入仓库名称（例如：`DAO`）
4. 选择仓库是 **Public**（公开）还是 **Private**（私有）
5. **不要**勾选 "Initialize this repository with a README"（因为我们已经有了代码）
6. 点击 **"Create repository"**

### 2. 连接本地仓库到 GitHub
在项目根目录执行以下命令（将 `YOUR_USERNAME` 和 `YOUR_REPO_NAME` 替换为你的实际信息）：

```bash
# 添加远程仓库（使用 HTTPS）
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 或者使用 SSH（如果你配置了 SSH 密钥）
git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git

# 将主分支重命名为 main（如果还没有）
git branch -M main

# 推送到 GitHub
git push -u origin main
```

### 3. 如果遇到认证问题
如果使用 HTTPS 推送时要求输入用户名和密码：
- GitHub 不再支持密码认证
- 需要使用 **Personal Access Token (PAT)**
- 创建 PAT：GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
- 生成新 token，勾选 `repo` 权限
- 推送时用户名输入你的 GitHub 用户名，密码输入生成的 token

### 4. 后续更新代码
每次修改代码后，使用以下命令推送：

```bash
git add .
git commit -m "描述你的更改"
git push
```

## 常用 Git 命令
- `git status` - 查看仓库状态
- `git log` - 查看提交历史
- `git remote -v` - 查看远程仓库地址
- `git pull` - 从 GitHub 拉取最新代码

