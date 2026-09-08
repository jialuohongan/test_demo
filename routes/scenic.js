/**
 * 路由：景点
 * 用户：查看全部 / 按名查 / 按编号查 / 查看热门排行 / 进入打卡
 * 管理员：增删改查
 */
const express = require('express');
const router = express.Router();
const { query } = require('../config/db');

// 鉴权中间件：用户
const requireUser = (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    next();
};
// 管理员鉴权
const requireAdmin = (req, res, next) => {
    if (!req.session.admin) return res.redirect('/login');
    next();
};

// ==================== 用户侧 ====================

// 查看所有景点（支持按名 / 按编号查询）
router.get('/', requireUser, async (req, res) => {
    const { name, id } = req.query;
    let sql = 'SELECT * FROM scenic_spot WHERE 1=1';
    const params = [];
    if (name) {
        sql += ' AND scenic_name LIKE ?';
        params.push('%' + name + '%');
    }
    if (id) {
        sql += ' AND scenic_id = ?';
        params.push(id);
    }
    sql += ' ORDER BY scenic_id ASC';
    try {
        const spots = await query(sql, params);
        const user = req.session.user;
        // 计算每个景点当前用户的打卡数
        const checkCount = await query(
            'SELECT scenic_id, COUNT(*) AS cnt FROM check_in_record WHERE user_id = ? GROUP BY scenic_id',
            [user.user_id]
        );
        const cntMap = {};
        checkCount.forEach(r => { cntMap[r.scenic_id] = r.cnt; });
        spots.forEach(s => { s.userChecked = cntMap[s.scenic_id] || 0; });
        res.render('scenic/list', { title: '查看景点', spots, query: { name, id } });
    } catch (err) {
        res.status(500).send('查询失败：' + err.message);
    }
});

// 查看热门景点排行（check_count >= 10）
router.get('/hot', requireUser, async (req, res) => {
    try {
        const hot = await query(
            'SELECT * FROM scenic_spot WHERE check_count >= 10 ORDER BY check_count DESC'
        );
        res.render('scenic/hot', { title: '热门景点排行', hot });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// 景点详情（看红色历史，可打卡）
router.get('/detail/:id', requireUser, async (req, res) => {
    const id = req.params.id;
    try {
        const rows = await query('SELECT * FROM scenic_spot WHERE scenic_id = ?', [id]);
        if (rows.length === 0) return res.status(404).send('景点不存在');
        const recent = await query(
            `SELECT r.experience, r.check_time, u.username
             FROM check_in_record r JOIN user u ON r.user_id = u.user_id
             WHERE r.scenic_id = ? ORDER BY r.check_time DESC LIMIT 10`,
            [id]
        );
        // 当前用户在此景点已有多少个打卡
        const myCount = await query(
            'SELECT COUNT(*) AS cnt FROM check_in_record WHERE scenic_id = ? AND user_id = ?',
            [id, req.session.user.user_id]
        );
        // 关联的革命人物
        const heroes = await query(
            'SELECT name, intro, image FROM hero_figure WHERE scenic_id = ? ORDER BY hero_id ASC',
            [id]
        );
        res.render('scenic/detail', {
            title: rows[0].scenic_name,
            spot: rows[0],
            recent,
            heroes,
            myCount: myCount[0].cnt
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// 写打卡心得 GET 页面
router.get('/checkin/:id', requireUser, async (req, res) => {
    const id = req.params.id;
    const rows = await query('SELECT * FROM scenic_spot WHERE scenic_id = ?', [id]);
    if (rows.length === 0) return res.status(404).send('景点不存在');
    res.render('checkin/write', { title: '打卡-' + rows[0].scenic_name, spot: rows[0] });
});

// ==================== 管理员侧 ====================

// 管理员景点管理列表
router.get('/admin/list', requireAdmin, async (req, res) => {
    const spots = await query('SELECT * FROM scenic_spot ORDER BY scenic_id DESC');
    res.render('admin/scenic-list', { title: '景点管理', spots });
});

// 管理员新增景点
router.get('/admin/add', requireAdmin, (req, res) => {
    res.render('admin/scenic-edit', { title: '新增景点', spot: null });
});

router.post('/admin/add', requireAdmin, async (req, res) => {
    const { scenic_name, location, description, red_history, image } = req.body;
    if (!scenic_name) {
        req.session.flash = { type: 'error', msg: '景点名必填' };
        return res.redirect('/scenic/admin/add');
    }
    await query(
        'INSERT INTO scenic_spot (scenic_name, location, description, red_history, image) VALUES (?, ?, ?, ?, ?)',
        [scenic_name, location, description, red_history, image || null]
    );
    req.session.flash = { type: 'success', msg: '景点已添加' };
    res.redirect('/scenic/admin/list');
});

// 管理员编辑景点
router.get('/admin/edit/:id', requireAdmin, async (req, res) => {
    const rows = await query('SELECT * FROM scenic_spot WHERE scenic_id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).send('景点不存在');
    res.render('admin/scenic-edit', { title: '编辑景点', spot: rows[0] });
});

router.post('/admin/edit/:id', requireAdmin, async (req, res) => {
    const { scenic_name, location, description, red_history, image } = req.body;
    await query(
        'UPDATE scenic_spot SET scenic_name=?, location=?, description=?, red_history=?, image=? WHERE scenic_id=?',
        [scenic_name, location, description, red_history, image || null, req.params.id]
    );
    req.session.flash = { type: 'success', msg: '景点已更新' };
    res.redirect('/scenic/admin/list');
});

// 删除景点
router.post('/admin/delete/:id', requireAdmin, async (req, res) => {
    try {
        await query('DELETE FROM scenic_spot WHERE scenic_id = ?', [req.params.id]);
        req.session.flash = { type: 'success', msg: '景点已删除（联动删除其打卡记录）' };
        res.redirect('/scenic/admin/list');
    } catch (err) {
        req.session.flash = { type: 'error', msg: '删除失败：' + err.message };
        res.redirect('/scenic/admin/list');
    }
});

module.exports = router;
