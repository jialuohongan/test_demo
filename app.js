/**
 * 红色文化学习打卡系统 - Express 主入口
 * 端口 3000（避开 80 与 8090 留给毕设其他子项目）
 */
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== 中间件 =====
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// EJS 模板
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 静态资源
app.use('/public', express.static(path.join(__dirname, 'public')));

// Session
app.use(session({
    secret: 'red-culture-checkin-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 天
}));

// 把 session 信息传到所有 view
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.admin = req.session.admin || null;
    res.locals.flash = req.session.flash || null;
    delete req.session.flash;
    next();
});

// ===== 路由分发 =====
const authRouter         = require('./routes/auth');
const scenicRouter       = require('./routes/scenic');
const announcementRouter = require('./routes/announcement');
const checkinRouter      = require('./routes/checkin');
const userRouter         = require('./routes/user');
const adminRouter        = require('./routes/admin');

app.use('/',                 authRouter);          // 首页 / 登录 / 注册 / 退出
app.use('/scenic',           scenicRouter);
app.use('/announcement',     announcementRouter);
app.use('/checkin',          checkinRouter);
app.use('/profile',          userRouter);
app.use('/admin',            adminRouter);

// 首页交给 routes/auth 处理（未登录跳登录，已登录跳转）

// ===== 404 =====
app.use((req, res) => {
    res.status(404).send('页面未找到: ' + req.originalUrl);
});

// ===== 全局错误处理 =====
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('系统异常: ' + err.message);
});

app.listen(PORT, () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🟥 红色文化学习打卡系统启动成功');
    console.log(`🌐 访问：http://localhost:${PORT}`);
    console.log(`👤 用户登录：test / 123456`);
    console.log(`🔑 管理员：admin / 123456`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});
