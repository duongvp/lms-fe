import test from 'node:test';
import assert from 'node:assert/strict';
import {scheduleFacetOptions} from '../helper/scheduleFacetOptions';

test('cross-filter choices keep selected labels during loading and temporary conflicts',()=>{
  const programs=[{value:'A',label:'A · Toán'},{value:'B',label:'B · Văn'},{value:'C',label:'C · Anh'}];
  assert.deepEqual(scheduleFacetOptions(programs,['B'],'A'),programs.slice(0,2));
  assert.deepEqual(scheduleFacetOptions(programs,undefined,'A'),[programs[0]]);
  assert.deepEqual(scheduleFacetOptions(programs,['B'],undefined),[programs[1]]);
  assert.deepEqual(scheduleFacetOptions(programs,[],undefined),[]);
  const weekdays=[{value:1,label:'Thứ 2'},{value:2,label:'Thứ 3'},{value:7,label:'Chủ nhật'}];
  assert.deepEqual(scheduleFacetOptions(weekdays,[1],[2,7]),weekdays);
});
