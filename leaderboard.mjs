import {mkdirSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {join} from 'node:path';
import {homedir} from 'node:os';

const folder=process.env.LANTERN_DATA_DIR??join(homedir(),'.dao-den-long');
const file=join(folder,'leaderboard.json');
export const validName=name=>typeof name==='string'&&/^[\p{L}0-9_]{3,12}$/u.test(name);
const sortEntries=entries=>entries.sort((a,b)=>b.score-a.score||Date.parse(a.achieved_at)-Date.parse(b.achieved_at)).slice(0,10);
export function readLeaderboard(){
  try {return {entries:sortEntries(JSON.parse(readFileSync(file,'utf8')).entries)};}
  catch(error){if(error.code==='ENOENT') return {entries:[]};throw error;}
}
export function addEntry({name,score,nights_won,seed}){
  if(!validName(name)||![score,nights_won,seed].every(Number.isSafeInteger)||score<0||nights_won<0||nights_won>3)
    throw new RangeError('Điểm hoặc tên không hợp lệ.');
  const {entries}=readLeaderboard();
  entries.push({name,score,nights_won,seed,achieved_at:new Date().toISOString()});
  const result={entries:sortEntries(entries)};
  mkdirSync(folder,{recursive:true});
  const temp=file+'.tmp';
  writeFileSync(temp,JSON.stringify(result,null,2)+'\n');
  renameSync(temp,file);
  return result;
}
