-- Hestia seed (S0.2, rev. dish-variety). Idempotent: DELETE + INSERT OR REPLACE,
-- so re-running fully resets the dish/juice/recipe library after calibration.
-- Run AFTER migrations: wrangler d1 execute hestia --remote --file=db/seed.sql
-- Protein values are per-serving ESTIMATES (grams of protein) — owner calibrates.

-- The dish library is fully owned by this seed; reset it so renamed/removed dishes
-- never linger in the rotation.
DELETE FROM dishes;

-- ── MAINS (parent-safe = no pork/beef). standalone=1 -> a complete one-bowl meal
--    (no rice/side added). sort_order curates the rotation so days alternate a
--    one-bowl dish and a protein + veg + carb set, and the protein source varies.
INSERT OR REPLACE INTO dishes
  (id,name_en,name_vi,type,protein_per_serving_g,parent_safe,serve_style,needs_assembly,cookable,standalone,sort_order) VALUES
 ('pho_ga','Chicken pho','Phở gà','main',25,1,'assemble',1,1,1,1),
 ('ca_kho_to','Clay-pot braised fish','Cá kho tộ','main',24,1,'reheat',0,1,0,2),
 ('goi_cuon','Fresh summer rolls (shrimp)','Gỏi cuốn tôm','main',14,1,'assemble',1,1,1,3),
 ('ga_kho_gung','Ginger chicken','Gà kho gừng','main',24,1,'reheat',0,1,0,4),
 ('bun_rieu','Crab & tomato vermicelli','Bún riêu cua','main',18,1,'assemble',1,1,1,5),
 ('tom_rim','Caramelized shrimp','Tôm rim','main',22,1,'reheat',0,1,0,6),
 ('com_ga_hoi_an','Hoi An chicken rice','Cơm gà Hội An','main',26,1,'plate_garnish',0,1,1,7),
 ('ca_chien','Pan-fried fish','Cá chiên','main',24,1,'reheat',0,1,0,8),
 ('banh_xeo','Sizzling crepe','Bánh xèo','main',16,1,'assemble',1,1,1,9),
 ('dau_hu_sot_ca','Tofu in tomato sauce','Đậu hủ sốt cà','main',12,1,'reheat',0,1,0,10),
 ('mi_quang','Quang-style turmeric noodles','Mì Quảng','main',20,1,'assemble',1,1,1,11),
 ('ga_luoc','Poached chicken','Gà luộc','main',26,1,'plate_garnish',0,1,0,12),
 ('bun_ca','Fish noodle soup','Bún cá','main',22,1,'assemble',1,1,1,13),
 ('muc_xao','Stir-fried squid','Mực xào','main',18,1,'reheat',0,1,0,14),
 ('banh_cuon','Steamed rice rolls','Bánh cuốn','main',14,1,'assemble',1,1,1,15),
 ('trung_chien','Vietnamese omelette','Trứng chiên','main',14,1,'reheat',0,1,0,16),
 ('hu_tieu','Phnom Penh noodle (chicken & shrimp)','Hủ tiếu Nam Vang','main',22,1,'assemble',1,1,1,17),
 ('ca_thu_kho','Braised mackerel','Cá thu kho','main',22,1,'reheat',0,1,0,18),
 ('xoi_ga','Sticky rice with chicken','Xôi gà','main',22,1,'reheat',0,1,1,19),
 ('ga_xao_sa_ot','Lemongrass & chili chicken','Gà xào sả ớt','main',24,1,'reheat',0,1,0,20),
 ('bun_thang','Hanoi chicken vermicelli','Bún thang','main',22,1,'assemble',1,1,1,21),
 ('goi_ga','Chicken & cabbage salad','Gỏi gà','main',20,1,'plate_garnish',0,1,0,22),
 ('chao_ga','Chicken congee','Cháo gà','main',16,1,'reheat',0,1,1,23),
 ('banh_canh_cua','Crab tapioca noodle soup','Bánh canh cua','main',20,1,'assemble',1,1,1,24);

-- ── SIDES (parent-safe veg; rotate alongside the protein + carb sets).
INSERT OR REPLACE INTO dishes
  (id,name_en,name_vi,type,protein_per_serving_g,parent_safe,serve_style,needs_assembly,cookable,standalone,sort_order) VALUES
 ('rau_muong_xao','Garlic water spinach','Rau muống xào tỏi','side',3,1,'reheat',0,1,0,1),
 ('canh_chua','Sour tamarind soup','Canh chua','side',5,1,'reheat',0,1,0,2),
 ('rau_luoc','Boiled seasonal greens','Rau luộc','side',2,1,'plate_garnish',0,1,0,3),
 ('ca_tim_nuong','Grilled eggplant & scallion','Cà tím nướng mỡ hành','side',2,1,'plate_garnish',0,1,0,4),
 ('canh_bi_do','Pumpkin & shrimp soup','Canh bí đỏ','side',4,1,'reheat',0,1,0,5),
 ('su_su_xao','Stir-fried chayote','Su su xào','side',3,1,'reheat',0,1,0,6),
 ('canh_rong_bien','Seaweed & egg soup','Canh rong biển','side',4,1,'reheat',0,1,0,7),
 ('bap_cai_luoc','Boiled cabbage','Bắp cải luộc','side',2,1,'plate_garnish',0,1,0,8),
 ('dua_gop','Pickled vegetables','Dưa góp','side',1,1,'serve_chilled',0,1,0,9),
 ('goi_du_du','Green papaya salad','Gỏi đu đủ','side',3,1,'plate_garnish',0,1,0,10);

-- ── CARBS (rotate; banh mi is now one of six, not the daily default).
INSERT OR REPLACE INTO dishes
  (id,name_en,name_vi,type,protein_per_serving_g,parent_safe,serve_style,needs_assembly,cookable,standalone,sort_order) VALUES
 ('com_trang','Steamed jasmine rice','Cơm trắng','carb',4,1,'cook_fresh',0,1,0,1),
 ('com_gao_lut','Brown rice','Cơm gạo lứt','carb',5,1,'cook_fresh',0,1,0,2),
 ('bun_tuoi','Fresh rice vermicelli','Bún tươi','carb',4,1,'plate_garnish',0,1,0,3),
 ('khoai_lang','Steamed sweet potato','Khoai lang luộc','carb',3,1,'reheat',0,1,0,4),
 ('banh_mi','Banh mi (baguette)','Bánh mì','carb',8,1,'plate_garnish',0,0,0,5),
 ('xoi_trang','Plain sticky rice','Xôi trắng','carb',8,1,'reheat',0,0,0,6);

-- ── PORK/BEEF dishes: kept in the library (parent_safe=0) so they are available
--    later for the sons, but EXCLUDED from today's shared rotation (loadLists
--    filters parent_safe=1). sort_order 90+ keeps them last if ever enabled.
INSERT OR REPLACE INTO dishes
  (id,name_en,name_vi,type,protein_per_serving_g,parent_safe,serve_style,needs_assembly,cookable,standalone,sort_order) VALUES
 ('pho_bo','Beef pho','Phở bò','main',26,0,'assemble',1,1,1,90),
 ('bun_bo_hue','Spicy beef noodle','Bún bò Huế','main',24,0,'assemble',1,1,1,91),
 ('bun_thit_nuong','Grilled pork vermicelli','Bún thịt nướng','main',24,0,'assemble',1,1,1,92),
 ('com_tam_suon','Pork-chop broken rice','Cơm tấm sườn','main',28,0,'plate_garnish',0,1,1,93),
 ('thit_kho_trung','Braised pork & egg','Thịt kho trứng','main',22,0,'reheat',0,1,0,94),
 ('bo_luc_lac','Shaking beef','Bò lúc lắc','main',26,0,'reheat',0,1,0,95);

-- ── DESSERTS & FRUIT (protein-neutral; do not count toward the budget).
INSERT OR REPLACE INTO dishes
  (id,name_en,name_vi,type,protein_per_serving_g,parent_safe,serve_style,needs_assembly,cookable,standalone,sort_order) VALUES
 ('du_du','Papaya','Đu đủ','dessert',1,1,'serve_chilled',0,0,0,1),
 ('thanh_long','Dragon fruit','Thanh long','dessert',1,1,'serve_chilled',0,0,0,2),
 ('xoai','Mango','Xoài','dessert',1,1,'serve_chilled',0,0,0,3),
 ('chuoi','Banana','Chuối','dessert',1,1,'serve_chilled',0,0,0,4),
 ('che_dau_xanh','Mung-bean sweet soup','Chè đậu xanh','dessert',4,1,'serve_chilled',0,1,0,5),
 ('che_chuoi','Banana-coconut sweet soup','Chè chuối','dessert',3,1,'serve_chilled',0,1,0,6),
 ('banh_flan','Caramel custard','Bánh flan','dessert',4,1,'serve_chilled',0,0,0,7),
 ('sua_chua','Yogurt','Sữa chua','dessert',5,1,'serve_chilled',0,0,0,8);

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
  'Drain last night''s soaked nuts + chia. Add all ingredients to a blender with each person''s NAKPRO scoops (Milan 1.0, brother 1.5, dad 1.0, mom 0.5). Blend ~2 min until foamy. Put the finished pudding in the fridge; people can eat it whenever after it is ready.');
