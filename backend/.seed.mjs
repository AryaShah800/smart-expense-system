import mongoose from "mongoose"; import bcrypt from "bcrypt";
await mongoose.connect("mongodb://127.0.0.1:57325/");
const db=mongoose.connection.db;
await db.collection("users").deleteMany({email:"demo@x.com"});
await db.collection("users").insertOne({name:"Demo",email:"demo@x.com",password:await bcrypt.hash("Passw0rd!1",10),isVerified:true,createdAt:new Date()});
const B="http://localhost:7000/api";
let r=await fetch(B+"/users/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"demo@x.com",password:"Passw0rd!1"})});
console.log(r.status); const tok=r.headers.get("set-cookie"); const j=await r.json(); console.log(Object.keys(j));
const H={"Content-Type":"application/json",Authorization:"Bearer "+(j.token||"")};
const cats=await (await fetch(B+"/categories",{headers:H})).json(); console.log(JSON.stringify(cats).slice(0,200));
const list=cats.categories||cats; const exp=list.find(c=>c.type==="expense"), inc=list.find(c=>c.type==="income");
for(const [t,c,a,d] of [["income",inc,60000,"Salary"],["expense",exp,1200,"Groceries"],["expense",exp,450,"Coffee"],["expense",exp,3200,"Rent share"]]){
 const x=await fetch(B+"/transactions",{method:"POST",headers:H,body:JSON.stringify({type:t,categoryId:c._id,amount:a,description:d,date:new Date().toISOString()})});console.log(x.status);}
process.exit(0)
