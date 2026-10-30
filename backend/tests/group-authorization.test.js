import test from 'node:test';
import assert from 'node:assert/strict';
import Group from '../models/Group.js';
import GroupExpense from '../models/GroupExpense.js';
import Settlement from '../models/Settlement.js';
import GroupCategory from '../models/GroupCategory.js';
import User from '../models/user.js';
import {getGroupExpenses,getGroupSplits,getGroupLedger,getGroupCategories,addGroupCategory,joinGroup} from '../controllers/group.js';
const member='000000000000000000000001', outsider='000000000000000000000002', groupId='000000000000000000000003';
const group={_id:groupId,members:[{_id:member,username:'Member',toString(){return member}}],joinCode:'ABC123'};
const saved={g:Group.findById,f:Group.findOne,u:User.findById,e:GroupExpense.find,s:Settlement.find,c:GroupCategory.countDocuments,l:GroupCategory.find};
function res(){return{statusCode:200,status(n){this.statusCode=n;return this},json(v){this.body=v;return this}}}
function req(user,body={}){return{user:{_id:user},params:{id:groupId},body}}
function chain(){return{populate(){return this},sort(){return Promise.resolve([])},then(ok,no){return Promise.resolve([]).then(ok,no)}}}
function setup(){Group.findById=()=>({populate:()=>Promise.resolve(group),then:(ok,no)=>Promise.resolve(group).then(ok,no)});Group.findOne=async()=>group;User.findById=async()=>({invitations:[]});GroupExpense.find=()=>chain();Settlement.find=()=>chain();GroupCategory.countDocuments=async()=>1;GroupCategory.find=()=>chain()}
function restore(){Group.findById=saved.g;Group.findOne=saved.f;User.findById=saved.u;GroupExpense.find=saved.e;Settlement.find=saved.s;GroupCategory.countDocuments=saved.c;GroupCategory.find=saved.l}
for(const [name,fn] of Object.entries({getGroupExpenses,getGroupSplits,getGroupLedger,getGroupCategories,addGroupCategory})){test(`${name} denies outsiders`,async()=>{setup();try{const r=res();await fn(req(outsider,{name:'Private'}),r);assert.equal(r.statusCode,403)}finally{restore()}})}
for(const [name,fn] of Object.entries({getGroupExpenses,getGroupSplits,getGroupLedger,getGroupCategories})){test(`${name} permits members`,async()=>{setup();try{const r=res();await fn(req(member),r);assert.equal(r.statusCode,200)}finally{restore()}})}
test('group ID requires invitation',async()=>{setup();try{const r=res();await joinGroup(req(outsider,{groupId}),r);assert.equal(r.statusCode,403)}finally{restore()}});


test('invited user can join by group ID',async()=>{setup();const oldSave=group.save;try{User.findById=async()=>({invitations:[groupId],save:async()=>{}});group.save=async()=>{};const r=res();await joinGroup(req(outsider,{groupId}),r);assert.equal(r.statusCode,200)}finally{group.members=[{_id:member,username:'Member',toString(){return member}}];group.save=oldSave;restore()}});
test('join code permits joining without invitation',async()=>{setup();const oldSave=group.save;try{User.findById=async()=>({invitations:[],save:async()=>{}});group.save=async()=>{};const r=res();await joinGroup(req(outsider,{joinCode:'ABC123'}),r);assert.equal(r.statusCode,200)}finally{group.members=[{_id:member,username:'Member',toString(){return member}}];group.save=oldSave;restore()}});
