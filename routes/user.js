/**
 * 路由：个人信息（查看 / 修改资料 / 修改密码 / 修改用户名 / 修改密保）
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');

const requireUser = (req, res, next) => { if (!req.session.user) return res.redirect('/login'); next(); };

// 查看个人信息
router.get('/', requireUser, async (req, res) => {
    const user = req.session.user;
    const rows = await query(
        'SELECT user_id, username, score, register_time, real_name, gender, phone, location, security_question FROM user WHERE user_id = ?',
        [user.user_id]
    );
    res.render('profile', { title: '个人信息', info: rows[0] });
});

// 修改个人资料（姓名 / 性别 / 电话 / 所在地）
router.post('/info', requireUser, async (req, res) => {
    const { real_name, gender, phone, location } = req.body;
    if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
        req.session.flash = { type: 'error', msg: '手机号格式不正确' };
        return res.redirect('/profile');
    }
    try {
        await query(
            'UPDATE user SET real_name = ?, gender = ?, phone = ?, location = ? WHERE user_id = ?',
            [real_name || null, gender || null, phone || null, location || null, req.session.user.user_id]
        );
        req.session.flash = { type: 'success', msg: '个人资料已更新' };
    } catch (err) {
        console.error(err);
        req.session.flash = { type: 'error', msg: '更新失败：' + err.message };
    }
    res.redirect('/profile');
});

// 修改密保问题（登录状态下自助修改）
router.post('/security', requireUser, async (req, res) => {
    const { security_question, security_answer } = req.body;
    if (!security_question || !security_answer) {
        req.session.flash = { type: 'error', msg: '密保问题和答案都要填写' };
        return res.redirect('/profile');
    }
    try {
        await query(
            'UPDATE user SET security_question = ?, security_answer = ? WHERE user_id = ?',
            [security_question, security_answer.trim(), req.session.user.user_id]
        );
        req.session.flash = { type: 'success', msg: '密保问题已更新，忘记密码时可用它找回' };
    } catch (err) {
        console.error(err);
        req.session.flash = { type: 'error', msg: '更新失败：' + err.message };
    }
    res.redirect('/profile');
});

// 修改用户名（仅自己）
router.post('/username', requireUser, async (req, res) => {
    const { username } = req.body;
    if (!username || username.length < 3) {
        req.session.flash = { type: 'error', msg: '用户名至少 3 位' };
        return res.redirect('/profile');
    }
    // 重名检查
    const exist = await query('SELECT user_id FROM user WHERE username = ? AND user_id <> ?', [username, req.session.user.user_id]);
    if (exist.length > 0) {
        req.session.flash = { type: 'error', msg: '用户名已被占用' };
        return res.redirect('/profile');
    }
    await query('UPDATE user SET username = ? WHERE user_id = ?', [username, req.session.user.user_id]);
    req.session.user.username = username;
    req.session.flash = { type: 'success', msg: '用户名已更新' };
    res.redirect('/profile');
});

// 修改密码
router.post('/password', requireUser, async (req, res) => {
    const { oldPwd, newPwd, confirm } = req.body;
    if (!oldPwd || !newPwd) {
        req.session.flash = { type: 'error', msg: '请填写完整' };
        return res.redirect('/profile');
    }
    if (newPwd.length < 6) {
        req.session.flash = { type: 'error', msg: '新密码至少 6 位' };
        return res.redirect('/profile');
    }
    if (newPwd !== confirm) {
        req.session.flash = { type: 'error', msg: '两次密码不一致' };
        return res.redirect('/profile');
    }
    const rows = await query('SELECT password FROM user WHERE user_id = ?', [req.session.user.user_id]);
    if (!bcrypt.compareSync(oldPwd, rows[0].password)) {
        req.session.flash = { type: 'error', msg: '原密码错误' };
        return res.redirect('/profile');
    }
    const hash = bcrypt.hashSync(newPwd, 10);
    await query('UPDATE user SET password = ? WHERE user_id = ?', [hash, req.session.user.user_id]);
    req.session.flash = { type: 'success', msg: '密码已修改' };
    res.redirect('/profile');
});

module.exports = router;
