export function catalogVariantConflicts(sample,product) {
  const norm=s=>String(s||'').toLowerCase().replace(/\b(\d{1,2})\s+(\d)\s+(ton|kg|inch)\b/g,(_,a,b,u)=>a+'.'+b+' '+u);
  const expected=norm(sample.title),actual=norm(product.name),conflicts=[];
  const check=(field,re)=>{const a=re.exec(expected)?.[1],b=re.exec(actual)?.[1];if(a&&b&&Number(a)!==Number(b))conflicts.push({field,catalog:a,retailer:b});};
  const category=sample.category;
  if(['air-conditioners','refrigerators','washing-machines'].includes(category))check('star_rating',/\b(\d)\s*star\b/);
  if(category==='air-conditioners')check('ton_capacity',/\b(\d+(?:\.\d+)?)\s*tons?\b/);
  if(['air-coolers','geysers','refrigerators','microwave-ovens','water-purifiers'].includes(category))check('litre_capacity',/\b(\d+(?:\.\d+)?)\s*(?:l|litres?|liters?)\b/);
  if(category==='washing-machines')check('kg_capacity',/\b(\d+(?:\.\d+)?)\s*kg\b/);
  if(category==='ceiling-fans')check('blade_sweep_mm',/\b(\d{3,4})\s*mm\b/);
  if(['smart-tvs','tablets','laptops','desktop-computers'].includes(category))check('display_inches',/\b(\d+(?:\.\d+)?)\s*(?:inches|inch|")/);
  const storage=s=>[...s.matchAll(/\b(64|128|256|512|1024|2048)\s*gb\b/g)].map(m=>Number(m[1]));
  const a=storage(expected),b=storage(actual);
  if(a.length&&b.length&&Math.max(...a)!==Math.max(...b))
    conflicts.push({field:'storage_gb',catalog:Math.max(...a),retailer:Math.max(...b)});
  check('ram_gb',/\b(\d+)\s*gb\s*(?:ram|ddr)\b/);
  const cpu=s=>/\b(ryzen|ath[oa]lon|celeron|pentium)\b/.exec(s)?.[1];
  if(cpu(expected)&&cpu(actual)&&cpu(expected)!==cpu(actual))
    conflicts.push({field:'processor_family',catalog:cpu(expected),retailer:cpu(actual)});
  if(category==='induction-cooktops')check('power_watts',/\b(\d+)\s*w(?:atts?)?\b/);
  if(category==='tablets'&&/\b[45]g\b/.test(expected)&&/\bwi[ -]?fi only\b/.test(actual))
    conflicts.push({field:'connectivity',catalog:'cellular',retailer:'wi-fi only'});
  const palette=['black','white','blue','green','red','maroon','silver','grey','gray','pink','purple','violet','yellow','orange','brown','gold'];
  const color=s=>palette.find(c=>new RegExp('\\b'+c+'\\b').test(s))?.replace('gray','grey');
  if(color(expected)&&color(actual)&&color(expected)!==color(actual))
    conflicts.push({field:'color',catalog:color(expected),retailer:color(actual)});
  return conflicts;
}

