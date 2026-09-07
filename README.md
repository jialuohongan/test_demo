# 红色文化学习打卡系统

> 毕设完整 B/S 架构实现（WebStorm + Node.js + Express + EJS + MySQL）
> 严格对应 UML 图集（7 张图）。

---

## 一、技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | HTML + CSS（原生，无框架） |
| 模板 | EJS 服务端渲染 |
| 后端 | Node.js + Express 4.x |
| 数据库 | MySQL 8.0 |
| 鉴权 | express-session + bcryptjs |
| 部署端口 | **3000**（避开毕设微博 80、todo 8090） |

---

## 二、目录结构

```
D:\red_culture_checkin\
├── app.js                   Express 主入口
├── package.json
├── .gitignore
├── config\
│   └── db.js                MySQL 连接池（请改密码）
├── routes\
│   ├── auth.js              登录/注册/退出/首页
│   ├── scenic.js            景点 + 景点管理
│   ├── announcement.js      公告 + 公告管理
│   ├── checkin.js           打卡（核心业务，事务写 3 张表）
│   ├── user.js              个人信息
│   └── admin.js             管理员后台
├── views\
│   ├── _header.ejs / _footer.ejs
│   ├── login.ejs / register.ejs
│   ├── profile.ejs
│   ├── scenic\             list / detail / hot
│   ├── announcement\       list
│   ├── checkin\            write / my / edit
│   └── admin\              dashboard / users / scenic-list / scenic-edit /
│                          announcement-list / announcement-edit
├── public\
│   ├── css\style.css       全站样式
│   ├── js\
│   └── img\
└── sql\
    └── init.sql             建库脚本（严格按 E-R 图）
```

---

## 三、运行步骤（**必读**）

### 第 1 步：准备 MySQL

打开 MySQL 命令行（或用 Navicat / DataGrip / Apifox 等）：

```bash
mysql -u root -p
```

然后执行：

```bash
source D:/red_culture_checkin/sql/init.sql
```

> ⚠ 这一步**最重要**，不跑 init.sql 就没法用。
> 数据库名：`red_culture_checkin`
> 自动建表 + 写入：管理员 admin/123456、测试用户 test/123456、2 条公告、4 个景点。

### 第 2 步：改 config/db.js 的密码

打开 `config/db.js`，改这个（默认 root/root）：

```js
user:     'root',
password: '你的MySQL密码',
```

### 第 3 步：装依赖 + 启动

打开 WebStorm，Terminal 里执行：

```bash
cd D:\red_culture_checkin
npm install
npm start
```

或命令行：

```bash
cd /d D:\red_culture_checkin
npm install
npm start
```

看到下面的输出就是启动成功：

```
🟥 红色文化学习打卡系统启动成功
🌐 访问：http://localhost:3000
👤 用户登录：test / 123456
🔑 管理员：admin / 123456
```

### 第 4 步：访问

打开浏览器：

```
http://localhost:3000
```

---

## 四、演示流程（毕设答辩用）

### 用户侧
1. 注册一个新账号 `xiaoming / 123456`
2. 自动跳转登录页 → 登录
3. 进入「景点」页浏览，可按名/编号查询
4. 点任意景点 → 「查看详情」→ 「立即打卡」
5. 填心得后提交 → 学习积分 +1
6. 「我的打卡」查看记录、修改心得、删除（删除时积分 -1）
7. 「热门排行」查看 check_count ≥ 10 的景点
8. 「公告」查看管理员发的公告
9. 「个人信息」修改用户名 / 密码

### 管理员侧
1. 用 `admin / 123456` 登录（顶部 Tab 切到「管理员」）
2. 进入仪表盘，看统计
3. 「景点管理」→ 新增一个景点（含红色历史）
4. 「公告管理」→ 发布一条公告
5. 「所有用户」→ 按用户名搜索

---

## 五、关键实现要点（答辩话术）

### 1. 打卡事务三表同步（核心）
文件：`routes/checkin.js` `POST /`
- 写 `check_in_record`
- `user.score += 1`
- `scenic_spot.check_count += 1`
- **三步包在一个事务里**，失败全部回滚，避免脏数据

### 2. 热门排行
判定字段：`scenic_spot.check_count >= 10`
实现：每次打卡时 `+1`，删除时 `-1`（同步扣减）
优点：避免每次排行都要 JOIN+COUNT
排序：`ORDER BY check_count DESC`

### 3. 鉴权分层
- 用户路由用 `requireUser` 中间件
- 管理员路由用 `requireAdmin` 中间件
- 基于 express-session 维护会话

### 4. 密码安全
- 用 `bcryptjs` 单向加密（hash），不存明文
- 注册时 `bcrypt.hashSync(pwd, 10)` 哈希入库
- 登录时 `bcrypt.compareSync(input, hash)` 校验

### 5. 防止删除越权
打卡记录的删除必须 `user_id = ?` 才允许，防止 A 删 B 的记录。

---

## 六、常见问题

**Q：连不上 MySQL？**
A：确认服务启动了；config/db.js 的密码正确；端口默认 3306。

**Q：端口被占用？**
A：改 `app.js` 顶部的 `PORT = process.env.PORT || 3000`，或在命令行 `set PORT=3001 && npm start`。

**Q：EJS 改了页面没生效？**
A：EJS 模板无缓存，重启服务即可。

---

## 七、下一版本规划

需求文档第 4 条已提示：景点加图片字段时，建议**图片存到 `public/img/scenic/` 文件系统**，DB 只存路径，避免 BLOB 大对象拖慢数据库。

---

_毕设项目代码 · 作者 贾骆洪安_
