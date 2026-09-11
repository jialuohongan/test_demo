-- 图片功能增量脚本：给现有数据库的景点表加图片字段
USE red_culture_checkin;

-- 1. 景点表加图片字段（存 public/images/scenic/ 下的文件名）
ALTER TABLE scenic_spot ADD COLUMN image VARCHAR(255) DEFAULT NULL COMMENT '景点图片文件名';

-- 2. 给现有景点配图（占位图，之后可替换为真实照片）
UPDATE scenic_spot SET image = 'zunyi.jpg'    WHERE scenic_name LIKE '遵义%';
UPDATE scenic_spot SET image = 'jinggangshan.jpg' WHERE scenic_name LIKE '井冈山%';
UPDATE scenic_spot SET image = 'yanan.jpg'    WHERE scenic_name LIKE '延安%';
UPDATE scenic_spot SET image = 'xibaipo.jpg'  WHERE scenic_name LIKE '西柏坡%';
