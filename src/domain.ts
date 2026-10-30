export type Customer = {id:string;name:string;email:string;phone:string;address:string};
export type Item = {description:string;quantity:number;unitCents:number};
export type Estimate = {id:string;customerId:string;title:string;items:Item[];taxRate:number;status:'draft'|'approved';date:string};
export type Job = {id:string;customerId:string;estimateId:string;title:string;status:'scheduled'|'in_progress'|'completed';date:string;crew:string};
export type Invoice = {id:string;customerId:string;jobId:string;estimateId:string;title:string;items:Item[];taxRate:number;status:'unpaid'|'paid';date:string};
export type Activity = {id:string;text:string;time:string};
export type Workspace = {customers:Customer[];estimates:Estimate[];jobs:Job[];invoices:Invoice[];activity:Activity[]};
export type Proposal = {customerId:string;title:string;items:Item[];taxRate:number;date:string};
export const money = (cents:number) => new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',maximumFractionDigits:2}).format(cents/100);
const today=()=>new Date().toISOString().slice(0,10);
function ensure(ok:unknown,message:string):asserts ok {if(!ok)throw new Error(message);}
function text(value:unknown,label:string,max=160):string {ensure(typeof value==='string'&&value.trim().length>0&&value.trim().length<=max,`${label} is required (maximum ${max} characters).`);return value.trim();}
export function totals(items:Item[],taxRate:number) {
 ensure(Array.isArray(items)&&items.length>0&&items.length<=20,'Add 1 to 20 line items.');
 ensure(typeof taxRate==='number'&&Number.isFinite(taxRate)&&taxRate>=0&&taxRate<=25,'Tax must be between 0 and 25%.');
 const subtotal=items.reduce((sum,item)=>{text(item.description,'Line description');ensure(Number.isFinite(item.quantity)&&item.quantity>0&&item.quantity<=10000,'Quantity must be between 0 and 10,000.');ensure(Number.isSafeInteger(item.unitCents)&&item.unitCents>=0&&item.unitCents<=100000000,'Unit price must be valid cents, up to $1,000,000.');return sum+Math.round(item.quantity*item.unitCents);},0);
 ensure(Number.isSafeInteger(subtotal)&&subtotal<=100000000,'Document subtotal must be under $1,000,000.');
 const tax=Math.round(subtotal*taxRate/100);return {subtotal,tax,total:subtotal+tax};
}
const item=(description:string,quantity:number,unitCents:number):Item=>({description,quantity,unitCents});
export function seed():Workspace {
 const customers:Customer[]=[
  {id:'c-alex',name:'Alex Morgan',email:'alex.morgan@example.com',phone:'0400 000 101',address:'18 Sample Lane, Fitzroy VIC'},
  {id:'c-sarah',name:'Sarah Chen',email:'sarah.chen@example.com',phone:'0400 000 102',address:'42 Example Avenue, Richmond VIC'},
  {id:'c-james',name:'James Wilson',email:'james.wilson@example.com',phone:'0400 000 103',address:'7 Demo Street, Carlton VIC'},
  {id:'c-emma',name:'Emma Thompson',email:'emma.thompson@example.com',phone:'0400 000 104',address:'26 Sample Road, Brunswick VIC'},
  {id:'c-olivia',name:'Olivia Parker',email:'olivia.parker@example.com',phone:'0400 000 105',address:'11 Example Court, Hawthorn VIC'},
  {id:'c-noah',name:'Noah Williams',email:'noah.williams@example.com',phone:'0400 000 106',address:'53 Demo Parade, Northcote VIC'},
 ];
 const data:[string,string,string,Item[],Estimate['status'],Job['status']|null,string,string][]=[
 ['101','c-sarah','Kitchen refresh',[item('Cabinet preparation & refinishing',1,380000),item('Hardware installation',12,7500)],'approved','in_progress','2026-10-30','Jamie & Taylor'],
 ['102','c-alex','Living room repaint',[item('Wall preparation & painting',1,220000),item('Premium low-VOC paint',4,8500)],'approved','scheduled','2026-11-02','Sam & Riley'],
 ['103','c-james','Deck restoration',[item('Deck sanding & sealing',32,9500)],'approved','scheduled','2026-11-03','Jamie & Taylor'],
 ['104','c-emma','Bathroom tile repair',[item('Tile removal & replacement',1,185000)],'approved','completed','2026-10-27','Sam & Riley'],
 ['105','c-olivia','Home office fit-out',[item('Custom shelving & installation',1,320000)],'draft',null,'2026-11-06','Jamie & Taylor'],
 ['106','c-noah','Exterior touch-ups',[item('Exterior repairs & painting',1,170000)],'draft',null,'2026-11-09','Sam & Riley'],
 ['107','c-sarah','Entryway flooring',[item('Floor installation',16,13500)],'approved','completed','2026-10-23','Jamie & Taylor'],
 ['108','c-james','Laundry renovation',[item('Laundry cabinetry & plumbing',1,480000)],'approved','completed','2026-10-20','Sam & Riley'],
 ];
 return {customers,estimates:data.map(([n,customerId,title,items,status,,date])=>({id:`EST-${n}`,customerId,title,items,taxRate:10,status,date})),jobs:data.filter(d=>d[5]).map(([n,customerId,title,,,status,date,crew])=>({id:`JOB-${n}`,customerId,estimateId:`EST-${n}`,title,status:status!,date,crew})),invoices:['104','107'].map((n,i)=>{const d=data.find(d=>d[0]===n)!;return{id:`INV-${n}`,customerId:d[1],jobId:`JOB-${n}`,estimateId:`EST-${n}`,title:d[2],items:d[3],taxRate:10,status:i===0?'unpaid':'paid',date:d[6]};}),activity:[{id:'a1',text:'Kitchen refresh is in progress',time:'2026-10-30T09:15:00.000Z'},{id:'a2',text:'Invoice INV-107 marked paid',time:'2026-10-29T14:30:00.000Z'},{id:'a3',text:'Home office fit-out estimate prepared',time:'2026-10-29T10:00:00.000Z'}]};
}
function date(value:unknown):string {ensure(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value,'Choose a valid date.');return value;}
export function reduce(source:Workspace,command:any):Workspace {
 ensure(command&&typeof command==='object'&&typeof command.type==='string','A valid command is required.');
 const s:Workspace=structuredClone(source); let event='';
 const id=(prefix:string)=>`${prefix}-${crypto.randomUUID().slice(0,8)}`;
 const customer=(customerId:unknown)=>{ensure(s.customers.some(c=>c.id===customerId),'Choose an existing customer.');return customerId as string;};
 const limit=(list:unknown[])=>ensure(list.length<100,'This demo supports up to 100 records per category.');
 switch(command.type) {
  case 'create_customer': {
   limit(s.customers);const name=text(command.name,'Customer name',80),email=text(command.email,'Email',120),address=text(command.address,'Address',180);ensure(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),'Enter a valid email address.');
   const phone=text(command.phone,'Phone',40);s.customers.push({id:id('c'),name,email,address,phone});event=`Customer ${name} added`;break;
  }
  case 'create_estimate': {
   limit(s.estimates);const customerId=customer(command.customerId),title=text(command.title,'Project title',100);totals(command.items,command.taxRate);const items=command.items.map((i:Item)=>({description:i.description.trim(),quantity:i.quantity,unitCents:i.unitCents}));
   s.estimates.push({id:id('EST'),customerId,title,items,taxRate:command.taxRate,date:date(command.date),status:'draft'});event=`Estimate for ${title} prepared`;break;
  }
  case 'approve_estimate': {
   const e=s.estimates.find(e=>e.id===command.id);ensure(e,'Estimate not found.');ensure(e.status==='draft','This estimate is already approved.');limit(s.jobs);e.status='approved';s.jobs.push({id:id('JOB'),customerId:e.customerId,estimateId:e.id,title:e.title,status:'scheduled',date:e.date,crew:'Team to be assigned'});event=`${e.title} approved and scheduled`;break;
  }
  case 'move_job': {
   const j=s.jobs.find(j=>j.id===command.id);ensure(j,'Job not found.');const next={scheduled:'in_progress',in_progress:'completed',completed:null}[j.status];ensure(command.status===next&&next!==null,'Invalid job transition. Start scheduled work, then complete it.');j.status=command.status;event=`${j.title} ${j.status==='completed'?'completed':'started'}`;break;
  }
  case 'create_invoice': {
   const j=s.jobs.find(j=>j.id===command.jobId);ensure(j,'Job not found.');ensure(j.status==='completed','Only completed jobs can be invoiced.');ensure(!s.invoices.some(i=>i.jobId===j.id),'This job already has an invoice.');limit(s.invoices);const e=s.estimates.find(e=>e.id===j.estimateId);ensure(e,'Original estimate not found.');s.invoices.push({id:id('INV'),customerId:j.customerId,jobId:j.id,estimateId:e.id,title:j.title,items:structuredClone(e.items),taxRate:e.taxRate,status:'unpaid',date:today()});event=`Invoice created for ${j.title}`;break;
  }
  case 'pay_invoice': {
   const inv=s.invoices.find(i=>i.id===command.id);ensure(inv,'Invoice not found.');ensure(inv.status==='unpaid','This invoice is already paid.');inv.status='paid';event=`Invoice ${inv.id} marked paid`;break;
  }
  default: throw new Error('Unknown workspace command.');
 }
 s.activity.unshift({id:id('a'),text:event,time:new Date().toISOString()});s.activity=s.activity.slice(0,30);return s;
}
export function parseCommand(input:string,s:Workspace):Proposal {
 const match=input.trim().match(/^(?:create|make|draft)\s+(?:an?\s+)?(.+?)\s+estimate\s+for\s+(.+?)[.!]?$/i);
 ensure(match,'Try “Create a painting estimate for Alex Morgan”.');const person=match[2].trim().toLowerCase();const matches=s.customers.filter(c=>c.name.toLowerCase()===person);ensure(matches.length===1,'Customer not found. Use their full name from Customers.');
 const service=match[1].trim();ensure(service.length<=80,'Keep the service description under 80 characters.');
 const painting=/paint/i.test(service);return {customerId:matches[0].id,title:service[0].toUpperCase()+service.slice(1),items:painting?[item('Surface preparation & painting labour',1,180000),item('Paint & materials allowance',1,35000)]:[item(`${service} — labour allowance`,1,150000),item('Materials allowance',1,30000)],taxRate:10,date:today()};
}
