/**
 * 固定管理员配置
 * 系统仅 1 名管理员，不建管理员表，账号密码固定在此。
 * 密码使用 bcrypt 加密存储，避免明文硬编码。
 * 修改管理员密码：用 node -e 生成新哈希后替换 ADMIN_HASH
 */
const bcrypt = require('bcryptjs');

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
// 对应明文密码 123456
const ADMIN_HASH = process.env.ADMIN_HASH || '$2a$10$BrPkPmR3HcDg28RrMaQJs.o0yqbXJMuUcDbVY7xKZoQ.jkLrGEJ9O';

module.exports = {
    username: ADMIN_USER,
    /**
     * 校验管理员登录
     * @param {string} username 输入的账号
     * @param {string} password 输入的明文密码
     * @returns {boolean} 是否登录成功
     */
    verify(username, password) {
        if (username !== ADMIN_USER) return false;
        return bcrypt.compareSync(password, ADMIN_HASH);
    }
};
