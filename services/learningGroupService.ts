import { fetchInstance } from '@/ultils/fetchInstance';
export type LearningGroup = { id:number; code:string; group_code:string; name:string; capacity:number|null; status:'active'|'inactive'|'closed' };
export type ProgramGroupData = { settings:{ code:string; teaching_model:'large_class'|'small_group'; default_capacity:number|null }; groups:LearningGroup[] };
const base = `${process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5000'}/api/learning-groups`;
export const getProgramGroups = (code:string):Promise<{data:ProgramGroupData}> => fetchInstance(`${base}/${encodeURIComponent(code)}`, { credentials:'include',cache:'no-store' });
const write = (code:string,path:string,method:string,body:unknown) => fetchInstance(`${base}/${encodeURIComponent(code)}/${path}`,{
  method,credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),
});
export const saveProgramSettings = (code:string,body:unknown) => write(code,'settings','PUT',body);
export const saveLearningGroup = (code:string,body:unknown,id?:number) => write(code,id?`groups/${id}`:'groups',id?'PUT':'POST',body);
