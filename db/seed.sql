-- Hestia seed (S0.2). Idempotent (INSERT OR REPLACE) so it can be re-run after
-- calibrating dish-protein estimates. Run: wrangler d1 execute DB --file=db/seed.sql
-- Representative library from the design doc; protein values are seeded estimates.

-- Vietnamese dishes (mains, sides, carbs). parent_safe=0 means contains pork/beef.
INSERT OR REPLACE INTO dishes (id,name_en,name_vi,type,protein_per_serving_g,parent_safe,serve_style,needs_assembly,cookable) VALUES
 ('pho_ga','Chicken pho','Phở gà','main',25,1,'assemble',1,1),
 ('bun_cha_ca','Fish-cake noodle','Bún chả cá','main',20,1,'assemble',1,1),
 ('bun_rieu','Crab/tomato vermicelli','Bún riêu cua','main',18,1,'assemble',1,1),
 ('mi_quang','Quang-style noodles','Mì Quảng','main',20,1,'assemble',1,1),
 ('ca_thu_kho','Braised mackerel','Cá thu kho','main',22,1,'reheat',0,1),
 ('tom_kho','Caramelized shrimp','Tôm kho','main',20,1,'reheat',0,1),
 ('muc_xao','Sweet & sour squid','Mực xào chua ngọt','main',18,1,'reheat',0,1),
 ('ga_kho_gung','Ginger chicken','Gà kho gừng','main',24,1,'reheat',0,1),
 ('dau_hu_chua_ngot','Sweet & sour tofu','Đậu hủ chua ngọt','main',12,1,'reheat',0,1),
 ('canh_ca_vien','Fish-ball soup','Canh cá viên','main',15,1,'reheat',0,1),
 ('sup_ga','Chicken soup','Súp gà','main',14,1,'reheat',0,1),
 ('goi_cuon','Fresh summer rolls','Gỏi cuốn','main',12,1,'assemble',1,0),
 ('banh_xeo','Sizzling crepe','Bánh xèo','main',16,1,'assemble',1,1),
 ('thit_kho_trung','Braised pork & egg','Thịt kho trứng','main',22,0,'reheat',0,1),
 ('com_tam_suon','Pork-chop broken rice','Cơm tấm sườn','main',28,0,'plate_garnish',0,0),
 ('bun_bo_hue','Spicy beef noodle','Bún bò Huế','main',24,0,'assemble',1,0),
 ('rau_muong_xao','Garlic water spinach','Rau muống xào tỏi','side',3,1,'reheat',0,1),
 ('rau_luoc','Boiled greens','Rau luộc','side',2,1,'plate_garnish',0,1),
 ('ca_tim_nuong','Grilled eggplant','Cà tím nướng','side',2,1,'plate_garnish',0,1),
 ('canh_bi_do','Pumpkin soup','Canh bí đỏ','side',3,1,'reheat',0,1),
 ('com_trang','Steamed rice','Cơm trắng','carb',4,1,'cook_fresh',0,1),
 ('xoi_man','Savory sticky rice','Xôi mặn','carb',8,1,'reheat',0,0),
 ('banh_mi','Banh mi','Bánh mì','carb',8,1,'plate_garnish',0,0);

-- Desserts & fruit (protein-neutral; do not count toward the budget).
INSERT OR REPLACE INTO dishes (id,name_en,name_vi,type,protein_per_serving_g,parent_safe,serve_style,needs_assembly,cookable) VALUES
 ('du_du','Papaya','Đu đủ','dessert',1,1,'serve_chilled',0,0),
 ('thanh_long','Dragon fruit','Thanh long','dessert',1,1,'serve_chilled',0,0),
 ('xoai','Mango','Xoài','dessert',1,1,'serve_chilled',0,0),
 ('chuoi','Banana','Chuối','dessert',1,1,'serve_chilled',0,0),
 ('che_dau_xanh','Mung-bean sweet soup','Chè đậu xanh','dessert',4,1,'serve_chilled',0,1),
 ('che_chuoi','Banana-coconut sweet soup','Chè chuối','dessert',3,1,'serve_chilled',0,1),
 ('banh_flan','Caramel custard','Bánh flan','dessert',4,1,'serve_chilled',0,0),
 ('sua_chua','Yogurt','Sữa chua','dessert',5,1,'serve_chilled',0,0);

-- Juices (daily rotation).
INSERT OR REPLACE INTO juices (id,name_en,name_vi) VALUES
 ('pennywort','Pennywort juice','Nước rau má'),
 ('brahmi','Brahmi juice','Nước rau đắng biển'),
 ('soy_milk','Soy milk','Sữa đậu nành'),
 ('orange','Orange juice','Nước cam');

-- Nutty Pudding recipe (S5/S2 helper recipe card; pea protein = NAKPRO).
INSERT OR REPLACE INTO recipes (key,name_en,name_vi,ingredients,steps_en) VALUES
 ('nutty_pudding','Nutty Pudding','Cháo hạt dinh dưỡng',
  '[{"en":"Ground macadamia (soaked)","qty":"3 Tbsp"},{"en":"Ground walnuts (soaked)","qty":"2 tsp"},{"en":"Chia seeds (soaked)","qty":"2 Tbsp"},{"en":"Ground flaxseed","qty":"1 tsp"},{"en":"Brazil nut","qty":"1/4"},{"en":"Cocoa","qty":"1 Tbsp"},{"en":"Sunflower lecithin","qty":"1 tsp"},{"en":"Ceylon cinnamon","qty":"1/2 tsp"},{"en":"Nut milk","qty":"50-100 ml"},{"en":"Pomegranate juice","qty":"60 ml"},{"en":"Mixed berries","qty":"75 g"},{"en":"Cherries","qty":"3"},{"en":"NAKPRO pea protein","qty":"per person scoops"}]',
  'Drain last night''s soaked nuts + chia. Add all ingredients to a blender with each person''s NAKPRO scoops (Milan 1.0, brother 1.5, dad 1.0, mom 0.5). Blend ~2 min until foamy.');
