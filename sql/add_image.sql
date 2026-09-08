-- 图片功能增量脚本：给现有数据库加图片字段和革命人物表
USE red_culture_checkin;

-- 1. 景点表加图片字段（存 public/images/scenic/ 下的文件名）
ALTER TABLE scenic_spot ADD COLUMN image VARCHAR(255) DEFAULT NULL COMMENT '景点图片文件名';

-- 2. 革命人物表
CREATE TABLE IF NOT EXISTS hero_figure (
    hero_id   INT PRIMARY KEY AUTO_INCREMENT COMMENT '人物ID',
    scenic_id INT NOT NULL COMMENT '关联景点ID',
    name      VARCHAR(50) NOT NULL COMMENT '人物姓名',
    intro     TEXT COMMENT '人物简介',
    image     VARCHAR(255) COMMENT '人物图片文件名(public/images/hero/)',
    FOREIGN KEY (scenic_id) REFERENCES scenic_spot(scenic_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='革命人物表';

-- 3. 给现有景点配图（占位图，之后可替换为真实照片）
UPDATE scenic_spot SET image = 'zunyi.jpg'    WHERE scenic_name LIKE '遵义%';
UPDATE scenic_spot SET image = 'jinggangshan.jpg' WHERE scenic_name LIKE '井冈山%';
UPDATE scenic_spot SET image = 'yanan.jpg'    WHERE scenic_name LIKE '延安%';
UPDATE scenic_spot SET image = 'xibaipo.jpg'  WHERE scenic_name LIKE '西柏坡%';

-- 4. 示例革命人物
INSERT INTO hero_figure (scenic_id, name, intro, image) VALUES
(1, '毛泽东', '遵义会议上确立了毛泽东在党和红军中的领导地位，成为党的第一代中央领导集体的核心。', 'mao.jpg'),
(2, '朱德', '井冈山会师后任红四军军长，与毛泽东共同巩固和扩大了井冈山革命根据地。', 'zhu.jpg'),
(3, '周恩来', '抗战时期在延安代表中共中央长期从事统一战线工作。', 'zhou.jpg'),
(4, '刘少奇', '西柏坡时期参与指挥三大战役，出席七届二中全会。', 'liu.jpg');
