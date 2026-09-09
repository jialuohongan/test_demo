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
    const { username, password, confirm, security_question, security_answer } = req.body;

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
    // 密保问题与答案必须成对出现
    if (!!security_question !== !!security_answer) {
        req.session.flash = { type: 'error', msg: '密保问题和答案需同时填写（或都留空）' };
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
        await query(
            'INSERT INTO user (username, password, security_question, security_answer, score) VALUES (?, ?, ?, ?, 0)',
            [username, hash, security_question || null, security_answer || null]
        );
        req.session.flash = { type: 'success', msg: '注册成功，请登录' };
        res.redirect('/login');
    } catch (err) {
        console.error(err);
        req.session.flash = { type: 'error', msg: '注册失败：' + err.message };
        res.redirect('/register');
    }
});

// ==================== 忘记密码（密保问题找回） ====================

// 找回页面：根据 session.forgot 状态显示对应步骤
router.get('/forgot', (req, res) => {
    const forgot = req.session.forgot;
    res.render('forgot', {
        step: forgot ? forgot.step : 'username',
        forgot_question: forgot ? forgot.question : ''
    });
});

// 第一步：输入用户名，查询密保问题
router.post('/forgot/username', async (req, res) => {
    const { username } = req.body;
    if (!username) {
        req.session.flash = { type: 'error', msg: '请输入用户名' };
        return res.redirect('/forgot');
    }
    try {
        const rows = await query(
            'SELECT username, security_question FROM user WHERE username = ?', [username]
        );
        if (rows.length === 0) {
            req.session.flash = { type: 'error', msg: '用户不存在，请检查用户名' };
            return res.redirect('/forgot');
        }
        if (!rows[0].security_question) {
            req.session.flash = { type: 'error', msg: '该账号未设置密保问题，无法自助找回，请联系管理员' };
            return res.redirect('/forgot');
        }
        req.session.forgot = {
            step: 'answer',
            username: rows[0].username,
            question: rows[0].security_question
        };
        res.redirect('/forgot');
    } catch (err) {
        console.error(err);
        req.session.flash = { type: 'error', msg: '查询失败：' + err.message };
        res.redirect('/forgot');
    }
});

// 第二步：验证密保答案
router.post('/forgot/answer', async (req, res) => {
    const forgot = req.session.forgot;
    if (!forgot || forgot.step !== 'answer') return res.redirect('/forgot');

    const { answer } = req.body;
    if (!answer) {
        req.session.flash = { type: 'error', msg: '请输入密保答案' };
        return res.redirect('/forgot');
    }
    try {
        const rows = await query(
            'SELECT security_answer FROM user WHERE username = ?', [forgot.username]
        );
        const stored = (rows[0].security_answer || '').trim().toLowerCase();
        const input = answer.trim().toLowerCase();
        if (stored !== input) {
            req.session.flash = { type: 'error', msg: '密保答案不正确' };
            return res.redirect('/forgot');
        }
        forgot.step = 'reset';
        req.session.forgot = forgot;
        res.redirect('/forgot');
    } catch (err) {
        console.error(err);
        req.session.flash = { type: 'error', msg: '验证失败：' + err.message };
        res.redirect('/forgot');
    }
});

// 第三步：设置新密码
router.post('/forgot/reset', async (req, res) => {
    const forgot = req.session.forgot;
    if (!forgot || forgot.step !== 'reset') return res.redirect('/forgot');

    const { password, confirm } = req.body;
    if (!password || password.length < 6) {
        req.session.flash = { type: 'error', msg: '密码至少 6 位' };
        return res.redirect('/forgot');
    }
    if (password !== confirm) {
        req.session.flash = { type: 'error', msg: '两次密码不一致' };
        return res.redirect('/forgot');
    }
    try {
        const hash = bcrypt.hashSync(password, 10);
        await query('UPDATE user SET password = ? WHERE username = ?', [hash, forgot.username]);
        delete req.session.forgot;
        req.session.flash = { type: 'success', msg: '密码重置成功，请用新密码登录' };
        res.redirect('/login');
    } catch (err) {
        console.error(err);
        req.session.flash = { type: 'error', msg: '重置失败：' + err.message };
        res.redirect('/forgot');
    }
});

// 放弃找回，清掉找回状态
router.get('/forgot/cancel', (req, res) => {
    delete req.session.forgot;
    res.redirect('/login');
});

// ===== 退出登录 =====
router.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
