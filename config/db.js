/**
 * MySQL 连接池配置
 * 修改下面的 config 适配你的本地 MySQL
 */
const mysql = require('mysql2');

const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '123456',     // 已同步为你的 MySQL 密码
    database: process.env.DB_NAME || 'red_culture_checkin',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    dateStrings: true   // 日期直接返回字符串，避免时区问题
};

const pool = mysql.createPool(config);

// 检查连接
pool.getConnection((err, conn) => {
    if (err) {
        console.error('❌ MySQL 连接失败，请检查 config/db.js 配置');
        console.error('   错误信息：' + err.message);
        console.error('   💡 提示：确保 MySQL 已启动，且密码正确');
    } else {
        console.log('✅ MySQL 连接成功');
        conn.release();
    }
});

// Promise 包装版本
const query = (sql, params) => {
    return new Promise((resolve, reject) => {
        pool.query(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

module.exports = { pool, query };
