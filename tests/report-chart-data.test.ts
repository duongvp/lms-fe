import test from 'node:test';
import assert from 'node:assert/strict';
import {scheduleTrend} from '../components/teaching-reports/report-chart-data';
test('weekly trend uses Monday, fills missing weeks and clips to selected dates',()=>{
 const rows=scheduleTrend([{date:'2026-11-01',assigned:2},{date:'2026-11-02',assigned:3},{date:'2026-11-16',assigned:4},{date:'2026-11-30',assigned:5},{date:'2026-12-01',assigned:99}],'2026-11-01','2026-12-01','week');
 assert.deepEqual(rows.map(r=>[r.date,r.assigned]),[['2026-10-26',2],['2026-11-02',3],['2026-11-09',0],['2026-11-16',4],['2026-11-23',0],['2026-11-30',5]]);
});
test('monthly trend spans year boundaries and fills months without schedules',()=>{
 const rows=scheduleTrend([{date:'2026-12-31',assigned:2},{date:'2027-02-01',assigned:3}],'2026-12-15','2027-02-03','month');
 assert.deepEqual(rows.map(r=>[r.label,r.assigned]),[['12/2026',2],['01/2027',0],['02/2027',3]]);
 assert.deepEqual(scheduleTrend([],'2026-11-01','2026-12-01','week'),[]);
});

test('daily trend preserves each day, fills missing days and excludes the end boundary',()=>{
 const rows=scheduleTrend([{date:'2026-10-31',assigned:99},{date:'2026-11-01',assigned:2},{date:'2026-11-01',assigned:1},{date:'2026-11-03',assigned:4},{date:'2026-11-04',assigned:99}],'2026-11-01','2026-11-04','day');
 assert.deepEqual(rows,[{date:'2026-11-01',label:'01/11/2026',assigned:3},{date:'2026-11-02',label:'02/11/2026',assigned:0},{date:'2026-11-03',label:'03/11/2026',assigned:4}]);
 assert.deepEqual(scheduleTrend([{date:'2026-12-31',assigned:2}],'2026-12-31','2027-01-02','day').map(r=>r.label),['31/12/2026','01/01/2027']);
});
