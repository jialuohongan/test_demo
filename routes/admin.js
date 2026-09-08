/**
 * 路由：管理员后台
 * - 仪表盘：用户数/景点数/打卡总数/热门景点数

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
    let sql = 'SELECT user_id, username, score, register_time FROM user WHERE 1=1';
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

module.exports = router;
