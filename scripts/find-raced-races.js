#!/usr/bin/env node
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');
const file = path.join('backend','data','rider-150437-events-20260121_103727.json');
const cutoff = new Date(Date.now() - 10*24*60*60*1000);
const obj = JSON.parse(fs.readFileSync(file,'utf8'));
const races = obj.races || [];
const res = [];
for(const r of races){
  let dateVal = r.date;
  let dt = null;
  try{
    if(dateVal && typeof dateVal === 'string' && /^\d+$/.test(dateVal)){
      dt = new Date(parseInt(dateVal,10)*1000);
    } else if (dateVal){ dt = new Date(dateVal); }
  }catch(e){dt=null}
  if(!dt) continue;
  if(dt >= cutoff && r.position !== null && r.position !== undefined){
    res.push({event_id: r.event_id, name: r.name, date: dt.toISOString(), position: r.position});
  }
}
console.log('Found', res.length, 'races in last 10 days where rider has a position');
console.log(res);
