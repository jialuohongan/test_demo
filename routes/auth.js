/**
 * 路由：登录 / 注册 / 退出 / 首页
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');

// ===== 首页：登录跳转逻辑 =====
router.get('/', (req, res) => {
    if (req.session.user) return res.redirect('/scenic');
    if (req.session.admin) return res.redirect('/admin/dashboard');
    res.render('login');
});

// ===== 登录页面 =====
router.get('/login', (req, res) => {
    res.render('login');
});

// ===== 登录处理 =====
router.post('/login', async (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password) {
        req.session.flash = { type: 'error', msg: '请输入用户名和密码' };
        return res.redirect('/login');
    }

    try {
        if (role === 'admin') {
            const rows = await query('SELECT * FROM admin WHERE username = ?', [username]);
            if (rows.length === 0) {
                req.session.flash = { type: 'error', msg: '管理员账号不存在' };
                return res.redirect('/login');
            }
            const ok = bcrypt.compareSync(password, rows[0].password);
            if (!ok) {
                req.session.flash = { type: 'error', msg: '密码错误' };
                return res.redirect('/login');
            }
            req.session.admin = { admin_id: rows[0].admin_id, username: rows[0].username };
            return res.redirect('/admin/dashboard');
        } else {
            const rows = await query('SELECT * FROM user WHERE username = ?', [username]);
            if (rows.length === 0) {
                req.session.flash = { type: 'error', msg: '用户不存在，请先注册' };
                return res.redirect('/login');
            }
            const ok = bcrypt.compareSync(password, rows[0].password);
            if (!ok) {
                req.session.flash = { type: 'error', msg: '密码错误' };
                return res.redirect('/login');
            }
            req.session.user = {
                user_id: rows[0].user_id,
                username: rows[0].username,
                score: rows[0].score
            };
            return res.redirect('/scenic');
        }
    } catch (err) {
        console.error(err);
        req.session.flash = { type: 'error', msg: '登录失败：' + err.message };
        res.redirect('/login');
    }
});

// ===== 注册页面 =====
router.get('/register', (req, res) => {
    res.render('register');
});

// ===== 注册处理 =====
router.post('/register', async (req, res) => {
    const { username, password, confirm } = req.body;

    if (!username || username.length < 3) {
        req.session.flash = { type: 'error', msg: '用户名至少 3 位' };
        return res.redirect('/register');
    }
    if (!password || password.length < 6) {
        req.session.flash = { type: 'error', msg: '密码至少 6 位' };
        return res.redirect('/register');
    }
    if (password !== confirm) {
        req.session.flash = { type: 'error', msg: '两次密码不一致' };
        return res.redirect('/register');
    }

    try {
        // 检查重名
        const exist = await query('SELECT user_id FROM user WHERE username = ?', [username]);
        if (exist.length > 0) {
            req.session.flash = { type: 'error', msg: '用户名已被占用' };
            return res.redirect('/register');
        }
        const hash = bcrypt.hashSync(password, 10);
        await query('INSERT INTO user (username, password, score) VALUES (?, ?, 0)', [username, hash]);
        req.session.flash = { type: 'success', msg: '注册成功，请登录' };
        res.redirect('/login');
    } catch (err) {
        console.error(err);
        req.session.flash = { type: 'error', msg: '注册失败：' + err.message };
        res.redirect('/register');
    }
});

// ===== 退出登录 =====
router.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
