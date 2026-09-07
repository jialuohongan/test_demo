/**
 * 路由：个人信息（查看 / 修改密码 / 修改用户名）
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
        'SELECT user_id, username, score, register_time FROM user WHERE user_id = ?',
        [user.user_id]
    );
    res.render('profile', { title: '个人信息', info: rows[0] });
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
