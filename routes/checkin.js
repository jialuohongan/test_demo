/**
 * 路由：打卡（核心业务）
 * - 进行打卡：写记录 + user.score+1 + scenic.check_count+1 （事务）
 * - 删除打卡：删记录 + user.score-1 + scenic.check_count-1 （事务）
 * - 修改打卡心得：只能改 experience
 * - 查看我的打卡：支持按 scenic_id / check_id 筛选，支持排序
 */
const express = require('express');
const router = express.Router();
const { pool, query } = require('../config/db');

const requireUser = (req, res, next) => { if (!req.session.user) return res.redirect('/login'); next(); };

// ====================== 提交打卡 ======================
router.post('/', requireUser, async (req, res) => {
    const { scenic_id, experience } = req.body;
    const user = req.session.user;

    if (!scenic_id)        return res.json({ code: 400, msg: '缺少景点' });
    if (!experience || !experience.trim()) return res.json({ code: 400, msg: '心得不能为空' });

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1. 写打卡记录
        const [r] = await conn.query(
            'INSERT INTO check_in_record (user_id, scenic_id, experience) VALUES (?, ?, ?)',
            [user.user_id, scenic_id, experience]
        );

        // 2. 用户 score +1
        await conn.query('UPDATE user SET score = score + 1 WHERE user_id = ?', [user.user_id]);

        // 3. 景点 check_count +1
        await conn.query('UPDATE scenic_spot SET check_count = check_count + 1 WHERE scenic_id = ?', [scenic_id]);

        // 4. 取出新积分（更新 session）
        const [u] = await conn.query('SELECT score FROM user WHERE user_id = ?', [user.user_id]);
        req.session.user.score = u[0].score;

        await conn.commit();
        res.json({ code: 200, msg: '打卡成功', data: { check_id: r.insertId, new_score: u[0].score } });
    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.json({ code: 500, msg: '打卡失败：' + err.message });
    } finally {
        conn.release();
    }
});

// ====================== 我的打卡列表 ======================
router.get('/my', requireUser, async (req, res) => {
    const user = req.session.user;
    const { scenic_id, check_id, sort } = req.query;
    let sql = `
        SELECT r.*, s.scenic_name, s.location
        FROM check_in_record r
        JOIN scenic_spot s ON r.scenic_id = s.scenic_id
        WHERE r.user_id = ?
    `;
    const params = [user.user_id];
    if (scenic_id) {
        sql += ' AND r.scenic_id = ?';
        params.push(scenic_id);
    }
    if (check_id) {
        sql += ' AND r.check_id = ?';
        params.push(check_id);
    }
    // 排序：默认按时间倒序；可选按景点 id 或心得长度等
    if (sort === 'time_asc')  sql += ' ORDER BY r.check_time ASC';
    else if (sort === 'time_desc') sql += ' ORDER BY r.check_time DESC';
    else                          sql += ' ORDER BY r.check_time DESC';

    try {
        const list = await query(sql, params);
        res.render('checkin/my', { title: '我的打卡记录', list, query: { scenic_id, check_id, sort } });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// ====================== 修改打卡心得 ======================
router.get('/edit/:check_id', requireUser, async (req, res) => {
    const user = req.session.user;
    const rows = await query(
        `SELECT r.*, s.scenic_name
         FROM check_in_record r JOIN scenic_spot s ON r.scenic_id = s.scenic_id
         WHERE r.check_id = ? AND r.user_id = ?`,
        [req.params.check_id, user.user_id]
    );
    if (rows.length === 0) return res.status(404).send('记录不存在或非本人');
    res.render('checkin/edit', { title: '修改心得', record: rows[0] });
});

router.post('/edit/:check_id', requireUser, async (req, res) => {
    const user = req.session.user;
    const { experience } = req.body;
    if (!experience || !experience.trim()) {
        req.session.flash = { type: 'error', msg: '心得不能为空' };
        return res.redirect(`/checkin/edit/${req.params.check_id}`);
    }
    // 仅修改心得（按需求）
    const exists = await query('SELECT user_id FROM check_in_record WHERE check_id = ?', [req.params.check_id]);
    if (exists.length === 0 || exists[0].user_id !== user.user_id) {
        return res.status(403).send('无权操作');
    }
    await query('UPDATE check_in_record SET experience = ? WHERE check_id = ?', [experience, req.params.check_id]);
    req.session.flash = { type: 'success', msg: '心得已更新' };
    res.redirect('/checkin/my');
});

// ====================== 删除打卡 ======================
router.post('/delete/:check_id', requireUser, async (req, res) => {
    const user = req.session.user;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const rows = await conn.query(
            'SELECT scenic_id FROM check_in_record WHERE check_id = ? AND user_id = ? FOR UPDATE',
            [req.params.check_id, user.user_id]
        );
        if (rows[0].length === 0) {
            await conn.rollback();
            return res.status(404).send('记录不存在或非本人');
        }
        const scenic_id = rows[0][0].scenic_id;

        // 1. 删记录
        await conn.query('DELETE FROM check_in_record WHERE check_id = ?', [req.params.check_id]);
        // 2. score -1
        await conn.query('UPDATE user SET score = GREATEST(score - 1, 0) WHERE user_id = ?', [user.user_id]);
        // 3. scenic.check_count -1
        await conn.query('UPDATE scenic_spot SET check_count = GREATEST(check_count - 1, 0) WHERE scenic_id = ?', [scenic_id]);

        // 4. 更新 session 中的 score
        const [u] = await conn.query('SELECT score FROM user WHERE user_id = ?', [user.user_id]);
        req.session.user.score = u[0].score;

        await conn.commit();
        req.session.flash = { type: 'success', msg: '打卡记录已删除，学习积分 -1' };
        res.redirect('/checkin/my');
    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).send('删除失败：' + err.message);
    } finally {
        conn.release();
    }
});

module.exports = router;
