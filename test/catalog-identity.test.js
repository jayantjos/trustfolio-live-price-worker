import {test} from 'node:test';
import assert from 'node:assert/strict';
import {catalogVariantConflicts} from '../catalog-identity.js';
for (const [label,category,catalog,retailer,field] of [
 ['HP actual catalog mismatch','desktop-computers','HP Ryzen 7 (16GB DDR4, 512GB SSD)','HP Atholon (8GB DDR4, 256GB SSD)','storage_gb'],
 ['Godrej actual capacity mismatch','refrigerators','Godrej 194 L 5 Star RD EMARVEL 215EN','Godrej 185L 5 Star RD EMARVEL 215EN','litre_capacity'],
 ['BAJAJ record 156','geysers','BAJAJ 15L 15 L Storage','BAJAJ Popular Plus 25 L Storage','litre_capacity'],
 ['Venus record 216','geysers','Venus Mega plus 25 L','Venus Mega plus 10 L','litre_capacity'],
 ['V-Guard record 236','geysers','V-Guard Zio 25 L','V-Guard Zio 15 L','litre_capacity'],
 ['Acer record 239','laptops','Acer N4500 8 GB 128 GB EMMC','Acer N4500 8 GB 64 GB EMMC','storage_gb'],
 ['Tecno record 203','smart-phones','Tecno Pova Curve 2 128 GB','Tecno Pova Curve 2 256 GB','storage_gb'],
 ['Voltas record 209','washing-machines','Voltas Beko 7 kg White','Voltas Beko 7 kg Maroon','color'],
 ['Cadlec record 218','induction-cooktops','Cadlec 2000 W Induction Cooktop','Cadlec 1998 W Induction Cooktop','power_watts'],
 ['Cadlec record 238','induction-cooktops','Cadlec 2000 W Induction Cooktop','Cadlec 1999 W Induction Cooktop','power_watts'],
 ['OnePlus record 227','tablets','OnePlus Pad Go 8 GB 128 GB with 4G','OnePlus Pad Go 8 GB 128 GB with Wi-Fi Only','connectivity']
]) test(label+' is rejected',()=>assert.ok(catalogVariantConflicts({category,title:catalog},{name:retailer}).some(x=>x.field===field)));
test('same laptop capacity with an extra GPU size is not a storage conflict',()=>assert.deepEqual(catalogVariantConflicts({category:'laptops',title:'Core i5 16 GB RAM 512 GB SSD'},{name:'Core i5 16 GB RAM 512 GB SSD 4 GB graphics'}),[]));
test('missing dimensions remain unknown rather than fabricated conflicts',()=>assert.deepEqual(catalogVariantConflicts({category:'geysers',title:'Brand 25 L'},{name:'Brand storage water heater'}),[]));
test('DDR4 RAM mismatch is rejected even with the same SSD size',()=>assert.ok(catalogVariantConflicts({category:'desktop-computers',title:'HP 16GB DDR4, 512GB SSD'},{name:'HP 8GB DDR4, 512GB SSD'}).some(x=>x.field==='ram_gb')));
