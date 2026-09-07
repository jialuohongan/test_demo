/**
 * 路由：公告
 * 用户：查看全部 / 按标题查 / 按编号查
 * 管理员：增删改查
 */
const express = require('express');
const router = express.Router();
const { query } = require('../config/db');

const requireUser = (req, res, next) => { if (!req.session.user) return res.redirect('/login'); next(); };
const requireAdmin = (req, res, next) => { if (!req.session.admin) return res.redirect('/login'); next(); };

// 查看公告
router.get('/', requireUser, async (req, res) => {
    const { title, id } = req.query;
    let sql = 'SELECT * FROM announcement WHERE 1=1';
    const params = [];
    if (title) {
        sql += ' AND title LIKE ?';
        params.push('%' + title + '%');
    }
    if (id) {
        sql += ' AND announcement_id = ?';
        params.push(id);
    }
    sql += ' ORDER BY publish_date DESC, announcement_id DESC';
    try {
        const list = await query(sql, params);
        res.render('announcement/list', { title: '查看公告', list, query: { title, id } });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// ===== 管理员侧 =====

router.get('/admin/list', requireAdmin, async (req, res) => {
    const list = await query('SELECT * FROM announcement ORDER BY publish_date DESC');
    res.render('admin/announcement-list', { title: '公告管理', list });
});

router.get('/admin/add', requireAdmin, (req, res) => {
    res.render('admin/announcement-edit', { title: '发布公告', item: null });
});

router.post('/admin/add', requireAdmin, async (req, res) => {
    const { title, content, publish_date, remark } = req.body;
    if (!title) {
        req.session.flash = { type: 'error', msg: '标题必填' };
        return res.redirect('/announcement/admin/add');
    }
    await query(
        'INSERT INTO announcement (title, content, publish_date, remark) VALUES (?, ?, ?, ?)',
        [title, content, publish_date, remark]
    );
    req.session.flash = { type: 'success', msg: '公告已发布' };
    res.redirect('/announcement/admin/list');
});

router.get('/admin/edit/:id', requireAdmin, async (req, res) => {
    const rows = await query('SELECT * FROM announcement WHERE announcement_id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).send('公告不存在');
    res.render('admin/announcement-edit', { title: '编辑公告', item: rows[0] });
});

router.post('/admin/edit/:id', requireAdmin, async (req, res) => {
    const { title, content, publish_date, remark } = req.body;
    await query(
        'UPDATE announcement SET title=?, content=?, publish_date=?, remark=? WHERE announcement_id=?',
        [title, content, publish_date, remark, req.params.id]
    );
    req.session.flash = { type: 'success', msg: '公告已更新' };
    res.redirect('/announcement/admin/list');
});

router.post('/admin/delete/:id', requireAdmin, async (req, res) => {
    await query('DELETE FROM announcement WHERE announcement_id = ?', [req.params.id]);
    req.session.flash = { type: 'success', msg: '公告已删除' };
    res.redirect('/announcement/admin/list');
});

module.exports = router;
