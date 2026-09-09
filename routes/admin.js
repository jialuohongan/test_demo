/**
 * 路由：管理员后台
 * - 仪表盘：用户数/景点数/打卡总数/热门景点数
 * - 查看所有用户
 */
const express = require('express');
const router = express.Router();
const { query } = require('../config/db');

const requireAdmin = (req, res, next) => { if (!req.session.admin) return res.redirect('/login'); next(); };

// 仪表盘
router.get('/dashboard', requireAdmin, async (req, res) => {
    try {
        const users       = await query('SELECT COUNT(*) AS cnt FROM user');
        const spots       = await query('SELECT COUNT(*) AS cnt FROM scenic_spot');
        const records     = await query('SELECT COUNT(*) AS cnt FROM check_in_record');
        const announcements = await query('SELECT COUNT(*) AS cnt FROM announcement');
        const hot         = await query('SELECT COUNT(*) AS cnt FROM scenic_spot WHERE check_count >= 10');
        const topSpots    = await query('SELECT scenic_id, scenic_name, check_count FROM scenic_spot ORDER BY check_count DESC LIMIT 5');

        res.render('admin/dashboard', {
            title: '管理员后台',
            stats: {
                users: users[0].cnt,
                spots: spots[0].cnt,
                records: records[0].cnt,
                announcements: announcements[0].cnt,
                hot: hot[0].cnt
            },
            topSpots
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// 查看所有用户
router.get('/users', requireAdmin, async (req, res) => {
    const { keyword, id } = req.query;
    let sql = 'SELECT user_id, username, score, register_time, security_question FROM user WHERE 1=1';
    const params = [];
    if (keyword) {
        sql += ' AND username LIKE ?';
        params.push('%' + keyword + '%');
    }
    if (id) {
        sql += ' AND user_id = ?';
        params.push(id);
    }
    sql += ' ORDER BY user_id ASC';
    const list = await query(sql, params);
    res.render('admin/users', { title: '所有用户', list, query: { keyword, id } });
});

// 管理员为用户设置/重置密保问题（用于自助找回密码）
router.post('/users/:id/security', requireAdmin, async (req, res) => {
    const { security_question, security_answer } = req.body;
    const userId = req.params.id;

    if (!security_question || !security_answer) {
        req.session.flash = { type: 'error', msg: '密保问题和答案都要填写' };
        return res.redirect('/admin/users');
    }

    try {
        const rows = await query('SELECT user_id FROM user WHERE user_id = ?', [userId]);
        if (rows.length === 0) {
            req.session.flash = { type: 'error', msg: '用户不存在' };
            return res.redirect('/admin/users');
        }
        await query(
            'UPDATE user SET security_question = ?, security_answer = ? WHERE user_id = ?',
            [security_question, security_answer.trim(), userId]
        );
        req.session.flash = { type: 'success', msg: '密保设置成功，该用户现在可以自助找回密码了' };
        res.redirect('/admin/users');
    } catch (err) {
        console.error(err);
        req.session.flash = { type: 'error', msg: '设置失败：' + err.message };
        res.redirect('/admin/users');
    }
});

module.exports = router;
