-- ============================================================
-- 红色文化学习打卡系统 - 数据库初始化脚本
-- 严格对应 E-R 图：user / admin / announcement / scenic_spot / check_in_record
-- ============================================================

DROP DATABASE IF EXISTS red_culture_checkin;
CREATE DATABASE red_culture_checkin DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE red_culture_checkin;

-- ----------------------------
-- 1. 用户表
-- ----------------------------
CREATE TABLE user (
    user_id           INT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
    username          VARCHAR(50)  UNIQUE NOT NULL COMMENT '用户名',
    password          VARCHAR(100) NOT NULL COMMENT '密码(bcrypt)',
    security_question VARCHAR(100) DEFAULT NULL COMMENT '密保问题(找回密码用)',
    security_answer   VARCHAR(100) DEFAULT NULL COMMENT '密保答案',
    real_name         VARCHAR(50)  DEFAULT NULL COMMENT '真实姓名',
    gender            VARCHAR(10)  DEFAULT NULL COMMENT '性别',
    phone             VARCHAR(20)  DEFAULT NULL COMMENT '电话号码',
    location          VARCHAR(100) DEFAULT NULL COMMENT '所在地',
    score             INT          DEFAULT 0 COMMENT '学习积分,打卡+1/删除-1',
    register_time     DATETIME     DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 说明：系统仅 1 名管理员，不建表，账号密码固定在 config/admin.js（bcrypt 加密）

-- ----------------------------
-- 3. 公告表
-- ----------------------------
CREATE TABLE announcement (
    announcement_id INT PRIMARY KEY AUTO_INCREMENT COMMENT '公告编号',
    title           VARCHAR(100) NOT NULL COMMENT '公告标题',
    content         TEXT         COMMENT '公告内容',
    publish_date    DATE         COMMENT '发布日期',
    remark          VARCHAR(255) DEFAULT '' COMMENT '备注'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='公告表';

-- ----------------------------
-- 4. 景点表（含热门判定字段）
-- ----------------------------
CREATE TABLE scenic_spot (
    scenic_id      INT PRIMARY KEY AUTO_INCREMENT COMMENT '景点编号',
    scenic_name    VARCHAR(100) NOT NULL COMMENT '景点名称',
    location       VARCHAR(200) COMMENT '地理位置',
    description    TEXT         COMMENT '景点描述',
    red_history    TEXT         COMMENT '红色历史',
    image          VARCHAR(255) DEFAULT NULL COMMENT '景点图片文件名(public/images/scenic/)',
    check_count    INT          DEFAULT 0 COMMENT '打卡次数,>=10 即热门'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='景点表';

-- ----------------------------
-- 5. 打卡记录表（关联用户与景点）
-- ----------------------------
CREATE TABLE check_in_record (
    check_id    INT PRIMARY KEY AUTO_INCREMENT COMMENT '打卡记录ID',
    user_id     INT  NOT NULL COMMENT '用户ID',
    scenic_id   INT  NOT NULL COMMENT '景点ID',
    check_time  DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '打卡时间',
    experience  TEXT COMMENT '打卡心得',
    FOREIGN KEY (user_id)   REFERENCES user(user_id)        ON DELETE CASCADE,
    FOREIGN KEY (scenic_id) REFERENCES scenic_spot(scenic_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='打卡记录表';

-- ----------------------------
-- 6. 革命人物表（关联景点）
-- ----------------------------
CREATE TABLE hero_figure (
    hero_id   INT PRIMARY KEY AUTO_INCREMENT COMMENT '人物ID',
    scenic_id INT NOT NULL COMMENT '关联景点ID',
    name      VARCHAR(50) NOT NULL COMMENT '人物姓名',
    intro     TEXT COMMENT '人物简介',
    image     VARCHAR(255) COMMENT '人物图片文件名(public/images/hero/)',
    FOREIGN KEY (scenic_id) REFERENCES scenic_spot(scenic_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='革命人物表';

-- 索引：按用户查打卡、按景点查打卡、按时间排序
CREATE INDEX idx_record_user   ON check_in_record(user_id);
CREATE INDEX idx_record_scenic ON check_in_record(scenic_id);
CREATE INDEX idx_record_time   ON check_in_record(check_time);

-- ============================================================
-- 初始数据
-- ============================================================

-- 测试用户（密码 123456，密保答案：dlou）
INSERT INTO user (username, password, security_question, security_answer, score) VALUES
('test', '$2a$10$BrPkPmR3HcDg28RrMaQJs.o0yqbXJMuUcDbVY7xKZoQ.jkLrGEJ9O', '我的学校是', 'dlou', 5);

-- 示例公告
INSERT INTO announcement (title, content, publish_date, remark) VALUES
('系统上线公告', '红色文化学习打卡系统正式上线，欢迎各位同学积极打卡学习红色文化！', '2026-09-01', '第一条公告'),
('七一建党通知', '七一建党节将至，系统将开展红色文化主题学习活动。', '2026-07-01', '专题活动');

-- 示例景点（含红色历史与图片）
INSERT INTO scenic_spot (scenic_name, location, description, red_history, image, check_count) VALUES
('遵义会议会址', '贵州省遵义市红花岗区', '中国共产党历史上生死攸关的转折点。', '1935年1月，中共中央在此召开政治局扩大会议，确立了毛泽东在党和红军中的领导地位。', 'zunyi.jpg', 12),
('井冈山革命根据地', '江西省吉安市', '中国革命的摇篮。', '1927年10月，毛泽东在此创建了第一个农村革命根据地。', 'jinggangshan.jpg', 8),
('延安革命纪念馆', '陕西省延安市', '展示中国共产党在延安时期革命斗争历史的综合性纪念馆。', '1935-1948年，中共中央在此指挥抗日战争和解放战争。', 'yanan.jpg', 6),
('西柏坡中共中央旧址', '河北省石家庄市平山县', '解放战争时期中共中央所在地。', '1948年5月至1949年3月，中共中央在此指挥三大战役。', 'xibaipo.jpg', 5);

-- 示例革命人物（图片放在 public/images/hero/）
INSERT INTO hero_figure (scenic_id, name, intro, image) VALUES
(1, '毛泽东', '遵义会议上确立了毛泽东在党和红军中的领导地位，成为党的第一代中央领导集体的核心。', 'mao.jpg'),
(2, '朱德', '井冈山会师后任红四军军长，与毛泽东共同巩固和扩大了井冈山革命根据地。', 'zhu.jpg'),
(3, '周恩来', '抗战时期在延安代表中共中央长期从事统一战线工作。', 'zhou.jpg'),
(4, '刘少奇', '西柏坡时期参与指挥三大战役，出席七届二中全会。', 'liu.jpg');

SELECT '✅ 数据库初始化完成' AS msg;
SELECT '管理员账号: admin / 123456' AS info UNION ALL
SELECT '测试用户:  test  / 123456';
