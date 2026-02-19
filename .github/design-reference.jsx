import { useState, useMemo } from "react";

// --- Hierarchical Category Data ---
const CATEGORIES = [
  { group: "Auto/Transportation", subs: [
    { name: "Fuel", budget: 175 }, { name: "Service", budget: 0 }, { name: "Transportation", budget: 0 }, { name: "Other Auto", budget: 0 }
  ]},
  { group: "Clothing", subs: [
    { name: "Clothes/Shoes", budget: 0 }, { name: "Laundry/Dry Cleaning", budget: 0 }
  ]},
  { group: "Daily Living", subs: [
    { name: "Dining/Eating Out", budget: 200 }, { name: "Groceries", budget: 400 }, { name: "Personal Supplies", budget: 60 }, { name: "Pets", budget: 50 }
  ]},
  { group: "Discretionary", subs: [
    { name: "Robert", budget: 0 }, { name: "Kathleen", budget: 0 }
  ]},
  { group: "Dues/Subscriptions", subs: [
    { name: "Digital Services", budget: 50 }, { name: "Gym", budget: 0 }
  ]},
  { group: "Entertainment", subs: [
    { name: "Dates", budget: 75 }, { name: "Hobby", budget: 50 }, { name: "Books/Magazine", budget: 0 }, { name: "Other Entertainment", budget: 50 }
  ]},
  { group: "Household", subs: [
    { name: "Rent", budget: 750 }, { name: "Improvements", budget: 0 }, { name: "Farm and Garden", budget: 50 }, { name: "Maintenance", budget: 50 }, { name: "Furnishings", budget: 0 }, { name: "Appliances", budget: 0 }, { name: "Tools", budget: 0 }, { name: "Other Household", budget: 0 }
  ]},
  { group: "Insurance", subs: [
    { name: "Auto Insurance", budget: 62 }, { name: "Health Insurance", budget: 0 }, { name: "Other Insurance", budget: 0 }
  ]},
  { group: "Health", subs: [
    { name: "Medical Insurance", budget: 0 }, { name: "Medicine/Drug", budget: 0 }, { name: "Doctor/Dentist", budget: 0 }, { name: "Hospital", budget: 0 }
  ]},
  { group: "Utilities", subs: [
    { name: "Internet", budget: 75 }, { name: "Cellphone", budget: 40 }, { name: "Power", budget: 150 }, { name: "Water", budget: 80 }
  ]},
  { group: "Savings", subs: [
    { name: "Emergency Fund", budget: 0 }, { name: "Investments", budget: 0 }
  ]},
];

const INCOME_CATEGORIES = [
  { name: "Take Home Pay", budget: 7236.41 },
  { name: "401(k)", budget: 675 },
  { name: "Interest Income", budget: 100 },
  { name: "Gifts Received", budget: 0 },
  { name: "Tax Refunds", budget: 0 },
  { name: "Refunds/Reimbursements", budget: 0 },
  { name: "Other Income", budget: 0 },
];

const MOCK_ACCOUNTS = [
  { id: 1, name: "Chase Checking", lastFour: "2910", type: "checking", classification: "liquid", owner: "Robert", balance: 7997.18 },
  { id: 2, name: "Chase Savings", lastFour: "6152", type: "savings", classification: "liquid", owner: "Robert", balance: 300.01 },
  { id: 3, name: "UFB Savings", lastFour: "8897", type: "savings", classification: "liquid", owner: "Robert", balance: 48301.46 },
  { id: 4, name: "Credit Card", lastFour: "5423", type: "credit", classification: "liability", owner: "Robert", balance: -8659.36 },
  { id: 5, name: "Credit Card", lastFour: "1001", type: "credit", classification: "liability", owner: "Kathleen", balance: -1240.00 },
  { id: 6, name: "Investment Account", lastFour: "8169", type: "investment", classification: "investment", owner: "Robert", balance: 66441.17 },
  { id: 7, name: "401(k)", lastFour: "3184C", type: "retirement", classification: "investment", owner: "Robert", balance: 37598.15 },
  { id: 8, name: "Roth IRA", lastFour: "", type: "retirement", classification: "investment", owner: "Robert", balance: 20235.08 },
  { id: 9, name: "Venmo", lastFour: "", type: "venmo", classification: "liquid", owner: "Robert", balance: 0 },
  { id: 10, name: "Checking", lastFour: "4477", type: "checking", classification: "liquid", owner: "Kathleen", balance: 3412.50 },
  { id: 11, name: "Savings", lastFour: "9031", type: "savings", classification: "liquid", owner: "Kathleen", balance: 12800.00 },
  { id: 12, name: "401(k)", lastFour: "7720", type: "retirement", classification: "investment", owner: "Kathleen", balance: 22450.00 },
  { id: 13, name: "Venmo", lastFour: "", type: "venmo", classification: "liquid", owner: "Kathleen", balance: 45.00 },
];

const MOCK_TRANSACTIONS = [
  { id: 1, date: "2025-02-18", account: "CC (5423)", owner: "Robert", desc: "COSTCO WHOLESALE", group: "Daily Living", sub: "Groceries", amount: 187.43 },
  { id: 2, date: "2025-02-18", account: "CC (5423)", owner: "Robert", desc: "SHELL OIL", group: "Auto/Transportation", sub: "Fuel", amount: 52.18 },
  { id: 3, date: "2025-02-17", account: "Checking (2910)", owner: "Robert", desc: "INSIGHTSOFTWARE PAYROLL", group: "Income", sub: "Take Home Pay", amount: -3618.21 },
  { id: 4, date: "2025-02-17", account: "Retirement (3184C)", owner: "Robert", desc: "Contributions", group: "Income", sub: "401(k)", amount: -675.00 },
  { id: 5, date: "2025-02-16", account: "CC (5423)", owner: "Robert", desc: "AMAZON.COM", group: "Household", sub: "Other Household", amount: 34.99 },
  { id: 6, date: "2025-02-15", account: "Venmo (Robert)", owner: "Robert", desc: "To Kathleen: \"Groceries\"", group: "Daily Living", sub: "Groceries", amount: 95.00 },
  { id: 7, date: "2025-02-15", account: "CC (5423)", owner: "Robert", desc: "CHICK-FIL-A", group: "Daily Living", sub: "Dining/Eating Out", amount: 18.45 },
  { id: 8, date: "2025-02-14", account: "CC (5423)", owner: "Robert", desc: "TEXAS ROADHOUSE", group: "Entertainment", sub: "Dates", amount: 78.50 },
  { id: 9, date: "2025-02-14", account: "Venmo (Robert)", owner: "Robert", desc: "Jonathan Saacks: \"Airsoft ammo\"", group: "Entertainment", sub: "Hobby", amount: -25.00 },
  { id: 10, date: "2025-02-13", account: "CC (5423)", owner: "Robert", desc: "GEICO AUTO", group: "Insurance", sub: "Auto Insurance", amount: 62.00 },
  { id: 11, date: "2025-02-12", account: "CC (5423)", owner: "Robert", desc: "AT&T WIRELESS", group: "Utilities", sub: "Cellphone", amount: 40.00 },
  { id: 12, date: "2025-02-12", account: "CC (5423)", owner: "Robert", desc: "XFINITY", group: "Utilities", sub: "Internet", amount: 75.00 },
  { id: 13, date: "2025-02-10", account: "Savings (8897)", owner: "Robert", desc: "Interest Paid", group: "Income", sub: "Interest Income", amount: -198.45 },
  { id: 14, date: "2025-02-09", account: "CC (5423)", owner: "Robert", desc: "HOME DEPOT 6612", group: "Household", sub: "Improvements", amount: 43.21 },
  { id: 15, date: "2025-02-08", account: "CC (1001)", owner: "Kathleen", desc: "TARGET", group: "Clothing", sub: "Clothes/Shoes", amount: 89.00 },
  { id: 16, date: "2025-02-07", account: "Venmo (Robert)", owner: "Robert", desc: "To Lucas Paolella: \"On the Border\"", group: "Daily Living", sub: "Dining/Eating Out", amount: 32.00 },
  { id: 17, date: "2025-02-05", account: "CC (5423)", owner: "Robert", desc: "SPOTIFY", group: "Dues/Subscriptions", sub: "Digital Services", amount: 10.99 },
  { id: 18, date: "2025-02-03", account: "Checking (2910)", owner: "Robert", desc: "INSIGHTSOFTWARE PAYROLL", group: "Income", sub: "Take Home Pay", amount: -3618.21 },
  { id: 19, date: "2025-02-01", account: "Venmo (Kathleen)", owner: "Kathleen", desc: "Kathleen: \"Rent\"", group: "Household", sub: "Rent", amount: -750.00 },
  { id: 20, date: "2025-02-01", account: "CC (5423)", owner: "Robert", desc: "GIANT FOOD", group: "Daily Living", sub: "Groceries", amount: 142.67 },
  { id: 21, date: "2025-02-01", account: "CC (1001)", owner: "Kathleen", desc: "GIANT FOOD", group: "Daily Living", sub: "Groceries", amount: 67.30 },
  { id: 22, date: "2025-02-13", account: "Checking (4477)", owner: "Kathleen", desc: "COMPANY PAYROLL", group: "Income", sub: "Take Home Pay", amount: -2840.00 },
  { id: 23, date: "2025-02-12", account: "CC (1001)", owner: "Kathleen", desc: "ULTA BEAUTY", group: "Daily Living", sub: "Personal Supplies", amount: 42.50 },
  { id: 24, date: "2025-02-06", account: "Retirement (7720)", owner: "Kathleen", desc: "Contributions", group: "Income", sub: "401(k)", amount: -520.00 },
  { id: 25, date: "2025-02-10", account: "CC (1001)", owner: "Kathleen", desc: "PETCO", group: "Daily Living", sub: "Pets", amount: 38.75 },
];

const ANNUAL_INCOME = {
  "Take Home Pay": [7236,7236,7236,7236,7236,7236,7236,7236,0,0,0,0],
  "401(k)": [675,675,675,675,675,675,675,675,0,0,0,0],
  "Interest Income": [195,198,201,195,200,198,202,199,0,0,0,0],
  "Gifts Received": [0,0,0,0,0,500,0,0,0,0,0,0],
  "Tax Refunds": [0,0,2400,0,0,0,0,0,0,0,0,0],
};
const ANNUAL_EXPENSES = {
  "Auto/Transportation": { "Fuel": [160,52,175,150,140,165,170,155,0,0,0,0], "Service": [0,0,0,450,0,0,0,0,0,0,0,0] },
  "Daily Living": { "Dining/Eating Out": [185,179,210,165,195,220,190,175,0,0,0,0], "Groceries": [420,492,385,410,445,395,430,415,0,0,0,0], "Personal Supplies": [30,43,25,35,40,28,32,45,0,0,0,0], "Pets": [45,39,50,42,38,55,40,48,0,0,0,0] },
  "Entertainment": { "Dates": [60,79,85,55,70,90,65,75,0,0,0,0], "Hobby": [120,0,45,80,150,35,200,60,0,0,0,0], "Other Entertainment": [25,0,40,30,0,55,20,35,0,0,0,0] },
  "Household": { "Rent": [750,750,750,750,750,750,750,750,0,0,0,0], "Improvements": [0,43,0,125,0,0,85,0,0,0,0,0], "Farm and Garden": [0,0,35,45,60,40,30,25,0,0,0,0], "Maintenance": [0,0,0,0,50,0,0,0,0,0,0,0] },
  "Utilities": { "Internet": [75,75,75,75,75,75,75,75,0,0,0,0], "Cellphone": [40,40,40,40,40,40,40,40,0,0,0,0], "Power": [145,138,125,110,95,120,155,165,0,0,0,0], "Water": [72,68,70,75,80,78,82,76,0,0,0,0] },
  "Insurance": { "Auto Insurance": [62,62,62,62,62,62,62,62,0,0,0,0] },
  "Clothing": { "Clothes/Shoes": [0,89,0,45,0,120,0,0,0,0,0,0] },
  "Dues/Subscriptions": { "Digital Services": [50,11,50,11,50,11,50,11,0,0,0,0], "Gym": [0,0,0,0,0,0,300,0,0,0,0,0] },
};

const ASSETS = [
  { id:1, name:"Desktop PC", purchased:"2020-08-27", cost:1800, lifespan:12, salvage:500, current:1207 },
  { id:2, name:"Monitor 1", purchased:"2023-02-28", cost:900, lifespan:7, salvage:200, current:603 },
  { id:3, name:"Speakers", purchased:"2022-10-09", cost:400, lifespan:10, salvage:50, current:282 },
  { id:4, name:"TV", purchased:"2018-11-01", cost:2700, lifespan:10, salvage:400, current:1021 },
  { id:5, name:"Laptop", purchased:"2023-02-01", cost:2000, lifespan:8, salvage:300, current:1352 },
  { id:6, name:"Solar Panels", purchased:"2022-09-16", cost:5156, lifespan:25, salvage:720, current:4548 },
  { id:7, name:"EG4 Batteries (4)", purchased:"2022-09-16", cost:6000, lifespan:25, salvage:500, current:5247 },
  { id:8, name:"Camry", purchased:"2020-07-01", cost:6500, lifespan:10, salvage:2000, current:3965 },
  { id:9, name:"Dell Monitor", purchased:"2023-03-01", cost:904, lifespan:7, salvage:150, current:584 },
  { id:10, name:"Bicycle", purchased:"2021-01-31", cost:4500, lifespan:12, salvage:900, current:2984 },
  { id:11, name:"Airsoft Rifle", purchased:"2023-10-31", cost:1200, lifespan:10, salvage:200, current:970 },
];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmt = (n) => { if(n===0) return "—"; const a=Math.abs(n); return (n<0?"-":"")+"$"+a.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}); };
const fmtS = (n) => { if(n===0) return "—"; if(Math.abs(n)>=1000) return (n<0?"-":"")+"$"+(Math.abs(n)/1000).toFixed(1)+"k"; return fmt(n); };
const fmtW = (n) => { if(n===0) return "—"; return (n<0?"-":"")+"$"+Math.abs(Math.round(n)).toLocaleString(); };
const sum = (a) => a.reduce((s,v)=>s+v,0);

const COLORS = { "Auto/Transportation":"#ef4444","Clothing":"#ec4899","Daily Living":"#10b981","Discretionary":"#a855f7","Dues/Subscriptions":"#6366f1","Entertainment":"#8b5cf6","Household":"#3b82f6","Insurance":"#f59e0b","Health":"#14b8a6","Utilities":"#f97316","Savings":"#06b6d4" };
const I = {
  dashboard:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  transactions:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  budget:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>,
  reports:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  networth:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg>,
  import:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  settings:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  plus:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  search:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  upload:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  arrowUp:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>,
  arrowDown:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>,
  sparkle:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>,
  chevD:<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>,
  edit:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  user:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  users:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
};

const C={card:{background:"#fff",borderRadius:12,border:"1px solid #e8ecf1",padding:"16px 20px",boxShadow:"0 1px 2px rgba(0,0,0,0.04)"},tbl:{width:"100%",borderCollapse:"collapse",fontSize:13},th:{textAlign:"left",fontSize:11,fontWeight:600,color:"#64748b",padding:"8px 10px",borderBottom:"2px solid #e2e8f0",textTransform:"uppercase",letterSpacing:"0.04em"},td:{padding:"8px 10px",fontSize:13,color:"#475569"},btn:{border:"none",borderRadius:8,padding:"8px 16px",fontSize:13,fontWeight:600,cursor:"pointer"},btnSm:{border:"none",background:"none",fontSize:12,fontWeight:500,cursor:"pointer",padding:"4px 8px"},sel:{padding:"8px 12px",border:"1px solid #e2e8f0",borderRadius:8,fontSize:13,background:"#f8fafc",color:"#334155",cursor:"pointer"},mono:{fontFamily:"'DM Mono', monospace"},ab:{fontSize:11,padding:"2px 8px",background:"#f1f5f9",borderRadius:6,color:"#475569",fontFamily:"'DM Mono', monospace"},cb:{fontSize:11,padding:"2px 8px",background:"#eff6ff",borderRadius:6,color:"#3b82f6"}};

function KPI({label,value,sub,up,neutral}){return(<div style={C.card}><p style={{fontSize:11,color:"#64748b",margin:0,textTransform:"uppercase",letterSpacing:"0.05em",fontWeight:500}}>{label}</p><p style={{fontSize:22,fontWeight:800,color:"#0f172a",...C.mono,margin:"4px 0 0",letterSpacing:"-0.02em"}}>{value}</p>{sub&&<p style={{fontSize:11,margin:"4px 0 0",color:neutral?"#64748b":up?"#10b981":"#ef4444",display:"flex",alignItems:"center",gap:2}}>{!neutral&&(up?I.arrowUp:I.arrowDown)}{sub}</p>}</div>);}

function OwnerFilter({value,onChange}){
  return(<div style={{display:"flex",background:"#f1f5f9",borderRadius:8,padding:2}}>
    {[{k:"All",l:"All",i:I.users},{k:"Robert",l:"Robert",i:I.user},{k:"Kathleen",l:"Kathleen",i:I.user}].map(x=>(
      <button key={x.k} onClick={()=>onChange(x.k)} style={{...C.btn,padding:"6px 14px",fontSize:12,display:"flex",alignItems:"center",gap:5,background:value===x.k?"#fff":"transparent",color:value===x.k?"#0f172a":"#64748b",boxShadow:value===x.k?"0 1px 3px rgba(0,0,0,0.08)":"none",borderRadius:6}}>{x.i} {x.l}</button>
    ))}
  </div>);
}

// === DASHBOARD ===
function DashboardPage(){
  const txByGroup=useMemo(()=>{const m={};MOCK_TRANSACTIONS.filter(t=>t.group!=="Income"&&t.amount>0).forEach(t=>{m[t.group]=(m[t.group]||0)+t.amount;});return m;},[]);
  const budgetByGroup=useMemo(()=>{const m={};CATEGORIES.forEach(c=>{m[c.group]=c.subs.reduce((s,sub)=>s+sub.budget,0);});return m;},[]);
  const totalIncome=MOCK_TRANSACTIONS.filter(t=>t.amount<0).reduce((s,t)=>s+Math.abs(t.amount),0);
  const totalExp=MOCK_TRANSACTIONS.filter(t=>t.amount>0).reduce((s,t)=>s+t.amount,0);
  const liquid=MOCK_ACCOUNTS.filter(a=>a.classification==="liquid").reduce((s,a)=>s+a.balance,0);
  const netWorth=MOCK_ACCOUNTS.reduce((s,a)=>s+a.balance,0)+ASSETS.reduce((s,a)=>s+a.current,0);
  const sorted=Object.entries(txByGroup).sort((a,b)=>b[1]-a[1]);
  const subsByGroup=useMemo(()=>{const m={};MOCK_TRANSACTIONS.filter(t=>t.group!=="Income"&&t.amount>0).forEach(t=>{if(!m[t.group])m[t.group]={};m[t.group][t.sub]=(m[t.group][t.sub]||0)+t.amount;});return m;},[]);

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28}}>
      <div><h1 style={{fontSize:22,fontWeight:700,color:"#0f172a",margin:0}}>Dashboard</h1><p style={{color:"#64748b",fontSize:13,marginTop:4}}>February 2025 Overview</p></div>
      <div style={{display:"flex",gap:8}}>
        <button style={{...C.btn,background:"#f1f5f9",color:"#334155"}}><span style={{display:"flex",alignItems:"center",gap:6}}>{I.sparkle} AI Summary</span></button>
        <button style={{...C.btn,background:"#0f172a",color:"#fff"}}><span style={{display:"flex",alignItems:"center",gap:6}}>{I.plus} Transaction</span></button>
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:28}}>
      <KPI label="Net Worth" value={fmtW(netWorth)} sub="+2.3%" up/>
      <KPI label="Liquid Assets" value={fmtW(liquid)} sub="+$198 interest" up/>
      <KPI label="Feb Income" value={fmtW(totalIncome)} sub="On track" up/>
      <KPI label="Feb Expenses" value={fmtW(totalExp)} sub={`${Math.round((totalExp/2517)*100)}% of budget`} neutral/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:28}}>
      <div style={C.card}>
        <h3 style={{fontSize:14,fontWeight:700,color:"#0f172a",margin:0}}>Spending by Category</h3>
        <p style={{fontSize:11,color:"#94a3b8",margin:"2px 0 12px"}}>Parent categories total all sub-categories</p>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {sorted.map(([g,spent])=>{
            const budg=budgetByGroup[g]||0;const pct=budg>0?Math.min(100,(spent/budg)*100):100;const color=COLORS[g]||"#64748b";
            const subs=subsByGroup[g]||{};
            return(<div key={g}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                <span style={{fontWeight:600,color:"#334155",display:"flex",alignItems:"center",gap:6}}>
                  <span style={{width:8,height:8,borderRadius:2,background:color,display:"inline-block"}}/>{g}
                </span>
                <span style={{color:"#64748b",...C.mono,fontSize:11}}>{fmt(spent)}{budg>0?` / ${fmt(budg)}`:""}</span>
              </div>
              <div style={{height:6,background:"#f1f5f9",borderRadius:3,overflow:"hidden",marginBottom:4}}>
                <div style={{height:"100%",width:`${pct}%`,background:budg>0&&spent>budg?"#ef4444":color,borderRadius:3}}/>
              </div>

            </div>);
          })}
        </div>
      </div>
      <div style={C.card}>
        <h3 style={{fontSize:14,fontWeight:700,color:"#0f172a",margin:0}}>Income vs Expenses (2025)</h3>
        <div style={{display:"flex",alignItems:"flex-end",gap:6,marginTop:16,height:160,paddingBottom:20}}>
          {MONTHS.map((m,i)=>{
            const inc=sum(Object.values(ANNUAL_INCOME).map(a=>a[i]));
            const exp=Object.values(ANNUAL_EXPENSES).reduce((s,g)=>s+Object.values(g).reduce((s2,a)=>s2+a[i],0),0);
            return(<div key={m} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
              <div style={{display:"flex",gap:2,alignItems:"flex-end",height:130}}>
                <div style={{width:8,height:`${(inc/10000)*130}px`,background:inc?"#3b82f6":"#e2e8f0",borderRadius:"2px 2px 0 0"}}/>
                <div style={{width:8,height:`${(exp/10000)*130}px`,background:exp?"#f97316":"#e2e8f0",borderRadius:"2px 2px 0 0"}}/>
              </div>
              <span style={{fontSize:10,color:inc?"#64748b":"#cbd5e1",...C.mono,fontWeight:500}}>{m}</span>
            </div>);
          })}
        </div>
        <div style={{display:"flex",gap:16,justifyContent:"center",marginTop:4}}>
          {[{c:"#3b82f6",l:"Income"},{c:"#f97316",l:"Expenses"}].map(x=>(
            <span key={x.l} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#64748b"}}>
              <span style={{width:8,height:8,background:x.c,borderRadius:2,display:"inline-block"}}/>{x.l}
            </span>
          ))}
        </div>
      </div>
    </div>
    <div style={C.card}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <h3 style={{fontSize:14,fontWeight:700,color:"#0f172a",margin:0}}>Recent Transactions</h3>
        <button style={{...C.btnSm,color:"#3b82f6"}}>View All →</button>
      </div>
      <table style={C.tbl}><thead><tr><th style={C.th}>Date</th><th style={C.th}>Description</th><th style={C.th}>Account</th><th style={C.th}>Category</th><th style={C.th}>Sub-Category</th><th style={{...C.th,textAlign:"right"}}>Amount</th></tr></thead>
      <tbody>{MOCK_TRANSACTIONS.slice(0,8).map(t=>(<tr key={t.id} style={{borderBottom:"1px solid #f1f5f9"}}><td style={{...C.td,...C.mono,fontSize:12}}>{t.date}</td><td style={{...C.td,color:"#0f172a",fontWeight:500}}>{t.desc}</td><td style={C.td}><span style={C.ab}>{t.account}</span></td><td style={C.td}><span style={{fontSize:11,color:"#64748b"}}>{t.group}</span></td><td style={C.td}><span style={C.cb}>{t.sub}</span></td><td style={{...C.td,textAlign:"right",...C.mono,fontWeight:600,color:t.amount<0?"#10b981":"#0f172a"}}>{t.amount<0?"+":""}{fmt(Math.abs(t.amount))}</td></tr>))}</tbody></table>
    </div>
  </div>);
}

// === TRANSACTIONS ===
function TransactionsPage(){
  const [search,setSearch]=useState("");const [fa,setFa]=useState("All");const [ft,setFt]=useState("All");
  const filtered=useMemo(()=>MOCK_TRANSACTIONS.filter(t=>{if(search&&!t.desc.toLowerCase().includes(search.toLowerCase())&&!t.sub.toLowerCase().includes(search.toLowerCase()))return false;if(fa!=="All"&&t.account!==fa)return false;if(ft==="Income"&&t.amount>=0)return false;if(ft==="Expense"&&t.amount<0)return false;return true;}),[search,fa,ft]);
  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
      <div><h1 style={{fontSize:22,fontWeight:700,color:"#0f172a",margin:0}}>Transactions</h1><p style={{color:"#64748b",fontSize:13,marginTop:4}}>{filtered.length} transactions</p></div>
      <button style={{...C.btn,background:"#0f172a",color:"#fff"}}><span style={{display:"flex",alignItems:"center",gap:6}}>{I.plus} Add Transaction</span></button>
    </div>
    <div style={{...C.card,display:"flex",gap:12,alignItems:"center",marginBottom:20,padding:"12px 16px"}}>
      <div style={{position:"relative",flex:1}}><span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#94a3b8"}}>{I.search}</span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search transactions..." style={{width:"100%",padding:"8px 8px 8px 34px",border:"1px solid #e2e8f0",borderRadius:8,fontSize:13,outline:"none",background:"#f8fafc"}}/>
      </div>
      <select value={fa} onChange={e=>setFa(e.target.value)} style={C.sel}><option>All</option><option>CC (5423)</option><option>CC (1001)</option><option>Checking (2910)</option><option>Savings (8897)</option><option>Venmo (Robert)</option><option>Venmo (Kathleen)</option></select>
      <select value={ft} onChange={e=>setFt(e.target.value)} style={C.sel}><option>All</option><option>Income</option><option>Expense</option></select>
    </div>
    <div style={C.card}><table style={C.tbl}><thead><tr><th style={C.th}>Date</th><th style={C.th}>Description</th><th style={C.th}>Account</th><th style={C.th}>Category</th><th style={C.th}>Sub-Category</th><th style={{...C.th,textAlign:"right"}}>Amount</th></tr></thead>
    <tbody>{filtered.map(t=>(<tr key={t.id} style={{borderBottom:"1px solid #f1f5f9",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><td style={{...C.td,...C.mono,fontSize:12}}>{t.date}</td><td style={{...C.td,color:"#0f172a",fontWeight:500}}>{t.desc}</td><td style={C.td}><span style={C.ab}>{t.account}</span></td><td style={C.td}><span style={{fontSize:11,color:"#64748b"}}>{t.group}</span></td><td style={C.td}><span style={C.cb}>{t.sub}</span></td><td style={{...C.td,textAlign:"right",...C.mono,fontWeight:600,color:t.amount<0?"#10b981":"#0f172a"}}>{t.amount<0?"+":""}{fmt(Math.abs(t.amount))}</td></tr>))}</tbody></table></div>
  </div>);
}

// === BUDGET ===
function BudgetPage(){
  const [owner,setOwner]=useState("All");
  const txs=useMemo(()=>owner==="All"?MOCK_TRANSACTIONS:MOCK_TRANSACTIONS.filter(t=>t.owner===owner),[owner]);
  const incAct=useMemo(()=>{const m={};txs.filter(t=>t.group==="Income").forEach(t=>{m[t.sub]=(m[t.sub]||0)+Math.abs(t.amount);});return m;},[txs]);
  const expAct=useMemo(()=>{const m={};txs.filter(t=>t.group!=="Income"&&t.amount>0).forEach(t=>{if(!m[t.group])m[t.group]={};m[t.group][t.sub]=(m[t.group][t.sub]||0)+t.amount;});return m;},[txs]);
  const tBI=INCOME_CATEGORIES.reduce((s,c)=>s+c.budget,0);const tAI=Object.values(incAct).reduce((s,v)=>s+v,0);
  const tBE=CATEGORIES.reduce((s,g)=>s+g.subs.reduce((s2,sub)=>s2+sub.budget,0),0);
  const tAE=Object.values(expAct).reduce((s,g)=>s+Object.values(g).reduce((s2,v)=>s2+v,0),0);

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
      <div><h1 style={{fontSize:22,fontWeight:700,color:"#0f172a",margin:0}}>Monthly Budget</h1><p style={{color:"#64748b",fontSize:13,marginTop:4}}>February 2025</p></div>
      <div style={{display:"flex",gap:12,alignItems:"center"}}>
        <OwnerFilter value={owner} onChange={setOwner}/>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <button style={{...C.btnSm,color:"#334155"}}>← Jan</button>
          <span style={{fontSize:13,fontWeight:600,color:"#0f172a",padding:"0 8px"}}>Feb 2025</span>
          <button style={{...C.btnSm,color:"#334155"}}>Mar →</button>
        </div>
      </div>
    </div>
    {owner!=="All"&&<div style={{...C.card,background:"#eff6ff",border:"1px solid #bfdbfe",padding:"10px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
      <span style={{color:"#3b82f6"}}>{I.user}</span><span style={{fontSize:13,color:"#1e40af"}}>Showing data from <strong>{owner}'s</strong> accounts only</span>
    </div>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:24}}>
      <KPI label="Budgeted Income" value={fmtW(tBI)}/><KPI label="Actual Income" value={fmtW(tAI)} sub={tAI>=tBI?"On track":`${fmtW(tBI-tAI)} remaining`} up={tAI>=tBI}/>
      <KPI label="Budgeted Expenses" value={fmtW(tBE)}/><KPI label="Actual Expenses" value={fmtW(tAE)} sub={`${fmtW(tBE-tAE)} remaining`} up/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
      <div style={C.card}><h3 style={{fontSize:14,fontWeight:700,color:"#10b981",margin:0}}>Income</h3>
        <table style={{...C.tbl,marginTop:8}}><thead><tr><th style={C.th}>Category</th><th style={{...C.th,textAlign:"right"}}>Budget</th><th style={{...C.th,textAlign:"right"}}>Actual</th><th style={{...C.th,textAlign:"right"}}>Diff</th></tr></thead>
        <tbody>{INCOME_CATEGORIES.map(c=>{const a=incAct[c.name]||0;const d=a-c.budget;return(<tr key={c.name} style={{borderBottom:"1px solid #f1f5f9"}}><td style={{...C.td,fontWeight:500}}>{c.name}</td><td style={{...C.td,textAlign:"right",...C.mono,fontSize:12}}>{c.budget>0?fmt(c.budget):"—"}</td><td style={{...C.td,textAlign:"right",...C.mono,fontSize:12,fontWeight:600}}>{a>0?fmt(a):"—"}</td><td style={{...C.td,textAlign:"right",...C.mono,fontSize:12,color:d>=0?"#10b981":"#ef4444"}}>{(c.budget>0||a>0)?(d>=0?"+":"")+fmt(d):"—"}</td></tr>);})}
        <tr style={{background:"#f8fafc"}}><td style={{...C.td,fontWeight:700}}>Total</td><td style={{...C.td,textAlign:"right",...C.mono,fontWeight:700}}>{fmt(tBI)}</td><td style={{...C.td,textAlign:"right",...C.mono,fontWeight:700}}>{fmt(tAI)}</td><td style={{...C.td,textAlign:"right",...C.mono,fontWeight:700,color:tAI>=tBI?"#10b981":"#ef4444"}}>{(tAI-tBI>=0?"+":"")+fmt(tAI-tBI)}</td></tr>
        </tbody></table>
      </div>
      <div style={C.card}><h3 style={{fontSize:14,fontWeight:700,color:"#f97316",margin:0}}>Expenses</h3>
        <div style={{maxHeight:460,overflowY:"auto",marginTop:8}}>
          {CATEGORIES.map(g=>{const gB=g.subs.reduce((s,sub)=>s+sub.budget,0);const ga=expAct[g.group]||{};const gA=Object.values(ga).reduce((s,v)=>s+v,0);
          return(<div key={g.group} style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`2px solid ${COLORS[g.group]||"#e2e8f0"}30`}}>
              <span style={{fontWeight:700,fontSize:12,color:"#334155",textTransform:"uppercase",letterSpacing:"0.05em",display:"flex",alignItems:"center",gap:6}}>
                <span style={{width:8,height:8,borderRadius:2,background:COLORS[g.group]||"#94a3b8"}}/>{g.group}
              </span>
              <span style={{fontWeight:600,fontSize:12,...C.mono,color:gA>gB&&gB>0?"#ef4444":"#64748b"}}>{gA>0?fmt(gA):"—"} / {gB>0?fmt(gB):"—"}</span>
            </div>
            {g.subs.map(sub=>{const a=ga[sub.name]||0;const pct=sub.budget>0?Math.min(100,(a/sub.budget)*100):(a>0?100:0);const d=sub.budget-a;
            return(<div key={sub.name} style={{display:"flex",alignItems:"center",padding:"4px 0 4px 14px",gap:8}}>
              <span style={{flex:1,fontSize:12,color:"#475569"}}>{sub.name}</span>
              <div style={{width:50,height:4,background:"#f1f5f9",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:sub.budget>0&&a>sub.budget?"#ef4444":COLORS[g.group]||"#3b82f6",borderRadius:2}}/></div>
              <span style={{width:60,textAlign:"right",fontSize:11,...C.mono,color:"#64748b"}}>{a>0?fmt(a):"—"}</span>
              <span style={{width:60,textAlign:"right",fontSize:11,...C.mono,color:d<0?"#ef4444":"#94a3b8"}}>{sub.budget>0?fmt(d):""}</span>
            </div>);})}
          </div>);})}
        </div>
      </div>
    </div>
  </div>);
}

// === REPORTS ===
function ReportsPage(){
  const [year,setYear]=useState(2025);const [eI,sEI]=useState(false);const [eE,sEE]=useState(false);const [eg,sEG]=useState({});
  const toggle=(g)=>sEG(p=>({...p,[g]:!p[g]}));
  const iM=MONTHS.map((_,i)=>sum(Object.values(ANNUAL_INCOME).map(a=>a[i])));
  const eM=MONTHS.map((_,i)=>Object.values(ANNUAL_EXPENSES).reduce((s,g)=>s+Object.values(g).reduce((s2,a)=>s2+a[i],0),0));
  const nM=MONTHS.map((_,i)=>iM[i]-eM[i]);const tI=sum(iM);const tE=sum(eM);

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
      <div><h1 style={{fontSize:22,fontWeight:700,color:"#0f172a",margin:0}}>Annual Report</h1><p style={{color:"#64748b",fontSize:13,marginTop:4}}>{year}{year===2025?" Year-to-Date":" Full Year"}</p></div>
      <select value={year} onChange={e=>setYear(Number(e.target.value))} style={{...C.sel,fontWeight:600}}><option value={2025}>2025</option><option value={2024}>2024</option><option value={2023}>2023</option></select>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:24}}>
      <KPI label="YTD Income" value={fmtW(tI)} sub="+1.2% vs prior" up/><KPI label="YTD Expenses" value={fmtW(tE)} sub="-4.8% vs prior" up/>
      <KPI label="YTD Net" value={fmtW(tI-tE)}/><KPI label="Avg Monthly Savings" value={fmtW((tI-tE)/8)} sub={`Savings rate: ${Math.round(((tI-tE)/tI)*100)}%`} up/>
    </div>
    <div style={{...C.card,overflowX:"auto"}}>
      <h3 style={{fontSize:14,fontWeight:700,color:"#0f172a",margin:0}}>Monthly Breakdown</h3>
      <p style={{fontSize:11,color:"#94a3b8",margin:"2px 0 12px"}}>Click rows to expand into categories → sub-categories</p>
      <table style={C.tbl}><thead><tr>
        <th style={{...C.th,width:200,minWidth:180}}>Category</th>
        {MONTHS.map(m=><th key={m} style={{...C.th,textAlign:"right",fontSize:11,padding:"8px 6px"}}>{m}</th>)}
        <th style={{...C.th,textAlign:"right",fontWeight:700}}>Total</th>
      </tr></thead><tbody>
        {/* INCOME */}
        <tr style={{background:"#f0fdf4",borderBottom:"2px solid #bbf7d0",cursor:"pointer"}} onClick={()=>sEI(!eI)}>
          <td style={{...C.td,fontWeight:700,color:"#15803d"}}><span style={{display:"flex",alignItems:"center",gap:6}}><span style={{transition:"transform 0.2s",transform:eI?"rotate(0)":"rotate(-90deg)",display:"flex"}}>{I.chevD}</span>Total Income</span></td>
          {iM.map((v,i)=><td key={i} style={{...C.td,textAlign:"right",...C.mono,fontSize:11,color:v?"#15803d":"#d1d5db"}}>{v?fmtS(v):"—"}</td>)}
          <td style={{...C.td,textAlign:"right",...C.mono,fontWeight:700,color:"#15803d"}}>{fmtS(tI)}</td>
        </tr>
        {eI&&Object.entries(ANNUAL_INCOME).map(([cat,vals])=>(
          <tr key={cat} style={{borderBottom:"1px solid #f1f5f9"}}>
            <td style={{...C.td,paddingLeft:36,fontSize:12,color:"#64748b"}}>{cat}</td>
            {vals.map((v,i)=><td key={i} style={{...C.td,textAlign:"right",...C.mono,fontSize:11,color:v?"#64748b":"#e2e8f0"}}>{v?fmtS(v):"—"}</td>)}
            <td style={{...C.td,textAlign:"right",...C.mono,fontSize:12,fontWeight:600,color:"#334155"}}>{fmtS(sum(vals))}</td>
          </tr>
        ))}

        {/* EXPENSES */}
        <tr style={{background:"#fff7ed",borderBottom:"2px solid #fed7aa",cursor:"pointer"}} onClick={()=>sEE(!eE)}>
          <td style={{...C.td,fontWeight:700,color:"#c2410c"}}><span style={{display:"flex",alignItems:"center",gap:6}}><span style={{transition:"transform 0.2s",transform:eE?"rotate(0)":"rotate(-90deg)",display:"flex"}}>{I.chevD}</span>Total Expenses</span></td>
          {eM.map((v,i)=><td key={i} style={{...C.td,textAlign:"right",...C.mono,fontSize:11,color:v?"#c2410c":"#d1d5db"}}>{v?fmtS(v):"—"}</td>)}
          <td style={{...C.td,textAlign:"right",...C.mono,fontWeight:700,color:"#c2410c"}}>{fmtS(tE)}</td>
        </tr>
        {eE&&Object.entries(ANNUAL_EXPENSES).map(([group,subs])=>{
          const gm=MONTHS.map((_,i)=>Object.values(subs).reduce((s,a)=>s+a[i],0));const isO=eg[group];
          return(<React.Fragment key={group}>
            <tr style={{background:"#fafafa",borderBottom:"1px solid #f1f5f9",cursor:"pointer"}} onClick={()=>toggle(group)}>
              <td style={{...C.td,paddingLeft:28,fontWeight:600,fontSize:12,color:"#334155"}}><span style={{display:"flex",alignItems:"center",gap:5}}><span style={{transition:"transform 0.2s",transform:isO?"rotate(0)":"rotate(-90deg)",display:"flex"}}>{I.chevD}</span><span style={{width:6,height:6,borderRadius:1,background:COLORS[group]||"#94a3b8",display:"inline-block"}}/>{group}</span></td>
              {gm.map((v,i)=><td key={i} style={{...C.td,textAlign:"right",...C.mono,fontSize:11,color:v?"#475569":"#e2e8f0"}}>{v?fmtS(v):"—"}</td>)}
              <td style={{...C.td,textAlign:"right",...C.mono,fontSize:12,fontWeight:600}}>{fmtS(sum(gm))}</td>
            </tr>
            {isO&&Object.entries(subs).map(([sub,vals])=>(
              <tr key={sub} style={{borderBottom:"1px solid #f8fafc"}}>
                <td style={{...C.td,paddingLeft:52,fontSize:11,color:"#94a3b8"}}>{sub}</td>
                {vals.map((v,i)=><td key={i} style={{...C.td,textAlign:"right",...C.mono,fontSize:11,color:v?"#94a3b8":"#e8ecf1"}}>{v?fmtS(v):"—"}</td>)}
                <td style={{...C.td,textAlign:"right",...C.mono,fontSize:11,color:"#64748b"}}>{fmtS(sum(vals))}</td>
              </tr>
            ))}
          </React.Fragment>);
        })}

        {/* NET */}
        <tr style={{background:"#f8fafc",borderTop:"2px solid #e2e8f0"}}>
          <td style={{...C.td,fontWeight:700,paddingLeft:30}}>NET</td>
          {nM.map((v,i)=><td key={i} style={{...C.td,textAlign:"right",...C.mono,fontSize:11,fontWeight:600,color:v>0?"#10b981":v<0?"#ef4444":"#d1d5db"}}>{iM[i]?fmtS(v):"—"}</td>)}
          <td style={{...C.td,textAlign:"right",...C.mono,fontWeight:700,color:"#10b981"}}>{fmtS(tI-tE)}</td>
        </tr>
      </tbody></table>
    </div>
  </div>);
}

// === NET WORTH ===
function NetWorthPage(){
  const [editId,setEditId]=useState(null);
  const liq=MOCK_ACCOUNTS.filter(a=>a.classification==="liquid");const inv=MOCK_ACCOUNTS.filter(a=>a.classification==="investment");const lia=MOCK_ACCOUNTS.filter(a=>a.classification==="liability");
  const tL=liq.reduce((s,a)=>s+a.balance,0);const tI=inv.reduce((s,a)=>s+a.balance,0);const tLi=lia.reduce((s,a)=>s+Math.abs(a.balance),0);const tA=ASSETS.reduce((s,a)=>s+a.current,0);const nw=tL+tI+tA-tLi;

  return(<div>
    <div style={{marginBottom:24}}><h1 style={{fontSize:22,fontWeight:700,color:"#0f172a",margin:0}}>Net Worth</h1><p style={{color:"#64748b",fontSize:13,marginTop:4}}>As of February 19, 2025</p></div>
    <div style={{...C.card,background:"linear-gradient(135deg,#0f172a 0%,#1e293b 100%)",color:"#fff",textAlign:"center",padding:32,marginBottom:24}}>
      <p style={{fontSize:13,color:"#94a3b8",margin:0,letterSpacing:"0.05em",textTransform:"uppercase"}}>Total Net Worth</p>
      <p style={{fontSize:40,fontWeight:800,...C.mono,margin:"8px 0",letterSpacing:"-0.02em"}}>{fmt(nw)}</p>
      <div style={{display:"flex",justifyContent:"center",gap:24,marginTop:12,flexWrap:"wrap"}}>
        {[{l:"Liquid Assets",v:tL,c:"#38bdf8"},{l:"Investments",v:tI,c:"#a78bfa"},{l:"Physical Assets",v:tA,c:"#fbbf24"},{l:"Liabilities",v:tLi,c:"#f87171",n:true}].map(s=>(
          <div key={s.l}><p style={{color:"#94a3b8",fontSize:10,margin:0,textTransform:"uppercase",letterSpacing:"0.05em"}}>{s.l}</p>
          <p style={{fontWeight:700,fontSize:18,...C.mono,margin:"4px 0 0",color:s.c}}>{s.n?`(${fmtS(s.v)})`:fmtS(s.v)}</p></div>
        ))}
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
      <div style={C.card}><h3 style={{fontSize:14,fontWeight:700,color:"#0f172a",margin:0}}>Accounts</h3>
        <div style={{marginTop:12}}>
          <SH label="Liquid Assets" total={tL} color="#38bdf8"/>
          {liq.map(a=><AR key={a.id} a={a}/>)}
          <SH label="Investments & Retirement" total={tI} color="#a78bfa"/>
          {inv.map(a=><AR key={a.id} a={a}/>)}
          <SH label="Liabilities" total={-tLi} color="#f87171" neg/>
          {lia.map(a=><AR key={a.id} a={a} neg/>)}
        </div>
      </div>
      <div style={C.card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <h3 style={{fontSize:14,fontWeight:700,color:"#0f172a",margin:0}}>Depreciable Assets</h3>
          <button style={{...C.btn,background:"#f1f5f9",color:"#334155",padding:"6px 12px",fontSize:12}}><span style={{display:"flex",alignItems:"center",gap:5}}>{I.plus} Add</span></button>
        </div>
        <table style={{...C.tbl,marginTop:12}}><thead><tr><th style={C.th}>Asset</th><th style={{...C.th,textAlign:"right"}}>Cost</th><th style={{...C.th,textAlign:"right"}}>Life</th><th style={{...C.th,textAlign:"right"}}>Current</th><th style={{...C.th,width:36}}></th></tr></thead>
        <tbody>{ASSETS.map(a=>(
          <tr key={a.id} style={{borderBottom:"1px solid #f1f5f9"}}>
            <td style={{...C.td,fontWeight:500}}>{a.name}<div style={{fontSize:10,color:"#94a3b8",...C.mono}}>{a.purchased}</div></td>
            <td style={{...C.td,textAlign:"right",...C.mono,fontSize:12,color:"#94a3b8"}}>{fmt(a.cost)}</td>
            <td style={{...C.td,textAlign:"right",...C.mono,fontSize:12,color:"#94a3b8"}}>{a.lifespan}yr</td>
            <td style={{...C.td,textAlign:"right",...C.mono,fontSize:12,fontWeight:600}}>{fmt(a.current)}</td>
            <td style={{...C.td,textAlign:"center"}}><button onClick={()=>setEditId(a.id===editId?null:a.id)} style={{...C.btnSm,color:"#94a3b8",padding:4}}>{I.edit}</button></td>
          </tr>
        ))}
        <tr style={{background:"#f8fafc"}}><td style={{...C.td,fontWeight:700}}>Total</td><td style={{...C.td,textAlign:"right",...C.mono,fontWeight:700}}>{fmt(ASSETS.reduce((s,a)=>s+a.cost,0))}</td><td></td><td style={{...C.td,textAlign:"right",...C.mono,fontWeight:700}}>{fmt(tA)}</td><td></td></tr>
        </tbody></table>
        {editId&&(()=>{const a=ASSETS.find(x=>x.id===editId);return(
          <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:8,padding:16,marginTop:12}}>
            <p style={{fontWeight:600,fontSize:13,color:"#0f172a",margin:"0 0 12px"}}>Edit: {a.name}</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {[{l:"Asset Name",v:a.name,t:"text"},{l:"Purchase Date",v:a.purchased,t:"date"},{l:"Original Cost ($)",v:a.cost,t:"number"},{l:"Lifespan (years)",v:a.lifespan,t:"number"},{l:"Salvage Value ($)",v:a.salvage,t:"number"}].map(f=>(
                <div key={f.l}><label style={{fontSize:11,color:"#64748b",fontWeight:500,display:"block",marginBottom:3}}>{f.l}</label>
                <input defaultValue={f.v} type={f.t} style={{width:"100%",padding:"6px 10px",border:"1px solid #e2e8f0",borderRadius:6,fontSize:13,background:"#fff"}}/></div>
              ))}
            </div>
            <div style={{display:"flex",gap:8,marginTop:12,justifyContent:"flex-end"}}>
              <button onClick={()=>setEditId(null)} style={{...C.btn,background:"#f1f5f9",color:"#64748b",padding:"6px 14px",fontSize:12}}>Cancel</button>
              <button onClick={()=>setEditId(null)} style={{...C.btn,background:"#0f172a",color:"#fff",padding:"6px 14px",fontSize:12}}>Save</button>
              <button style={{...C.btn,background:"#fef2f2",color:"#ef4444",padding:"6px 14px",fontSize:12}}>Delete</button>
            </div>
          </div>
        );})()}
      </div>
    </div>
  </div>);
}

function SH({label,total,color,neg}){return(<div style={{display:"flex",justifyContent:"space-between",padding:"8px 0 4px",borderBottom:`2px solid ${color}30`,marginTop:14}}><span style={{fontWeight:700,fontSize:11,color:"#334155",textTransform:"uppercase",letterSpacing:"0.05em",display:"flex",alignItems:"center",gap:6}}><span style={{width:8,height:8,borderRadius:2,background:color}}/>{label}</span><span style={{fontWeight:700,fontSize:13,...C.mono,color:neg?"#ef4444":"#0f172a"}}>{total<0?`(${fmt(Math.abs(total))})`:fmt(total)}</span></div>);}
function AR({a,neg}){return(<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0 6px 14px",borderBottom:"1px solid #f8fafc"}}><div><span style={{fontSize:13,color:"#475569"}}>{a.name} {a.lastFour&&<span style={{color:"#94a3b8",fontSize:11}}>({a.lastFour})</span>}</span><span style={{fontSize:10,color:"#94a3b8",marginLeft:8,textTransform:"uppercase"}}>{a.owner}</span></div><span style={{...C.mono,fontSize:13,fontWeight:600,color:neg&&a.balance<0?"#ef4444":"#0f172a"}}>{a.balance<0?`(${fmt(Math.abs(a.balance))})`:fmt(a.balance)}</span></div>);}

// === IMPORT ===
function ImportPage(){
  const [dragOver,setDO]=useState(false);const [step,setStep]=useState(0);
  const rows=[{d:"02/15/2025",desc:"COSTCO WHOLESALE #582",amt:-187.43,cat:"Daily Living",sub:"Groceries",c:.95},{d:"02/14/2025",desc:"TEXAS ROADHOUSE #1234",amt:-78.50,cat:"Entertainment",sub:"Dates",c:.72},{d:"02/13/2025",desc:"GEICO *AUTO",amt:-62.00,cat:"Insurance",sub:"Auto Insurance",c:.98},{d:"02/12/2025",desc:"AT&T *WIRELESS",amt:-40.00,cat:"Utilities",sub:"Cellphone",c:.97},{d:"02/10/2025",desc:"INTEREST PAYMENT",amt:198.45,cat:"Income",sub:"Interest Income",c:.99},{d:"02/09/2025",desc:"THE HOME DEPOT 6612",amt:-43.21,cat:"Household",sub:"Improvements",c:.68}];
  return(<div>
    <div style={{marginBottom:24}}><h1 style={{fontSize:22,fontWeight:700,color:"#0f172a",margin:0}}>Import Transactions</h1><p style={{color:"#64748b",fontSize:13,marginTop:4}}>Import CSV from your bank, credit card, or Venmo</p></div>
    <div style={{display:"flex",gap:4,marginBottom:24}}>{["Upload File","Map Columns","Review & Categorize"].map((s,i)=>(<div key={s} style={{flex:1,textAlign:"center"}}><div style={{height:3,background:i<=step?"#3b82f6":"#e2e8f0",borderRadius:2,marginBottom:6}}/><span style={{fontSize:11,color:i<=step?"#3b82f6":"#94a3b8",fontWeight:i===step?700:400}}>{s}</span></div>))}</div>
    {step===0&&<div style={{...C.card,padding:40,textAlign:"center"}} onDragOver={e=>{e.preventDefault();setDO(true);}} onDragLeave={()=>setDO(false)} onDrop={e=>{e.preventDefault();setDO(false);setStep(1);}}>
      <div style={{border:`2px dashed ${dragOver?"#3b82f6":"#cbd5e1"}`,borderRadius:16,padding:"48px 24px",background:dragOver?"#eff6ff":"#fafbfc"}}>
        <div style={{color:dragOver?"#3b82f6":"#94a3b8",marginBottom:12}}>{I.upload}</div>
        <p style={{fontWeight:600,color:"#334155",fontSize:15,margin:"0 0 4px"}}>Drop your CSV file here</p>
        <p style={{color:"#94a3b8",fontSize:13,margin:0}}>or <span style={{color:"#3b82f6",cursor:"pointer",fontWeight:500}} onClick={()=>setStep(1)}>browse files</span></p>
        <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:16}}>{["Chase","Venmo","Generic CSV"].map(t=>(<span key={t} style={{fontSize:11,padding:"3px 10px",background:"#f1f5f9",borderRadius:12,color:"#64748b"}}>{t}</span>))}</div>
      </div>
    </div>}
    {step===1&&<div style={C.card}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div><p style={{fontWeight:600,color:"#0f172a",margin:0}}>chase_statement_feb2025.csv</p><p style={{fontSize:12,color:"#64748b",margin:"4px 0 0"}}>Account: CC (5423) · Owner: Robert · 24 transactions</p></div>
        <button onClick={()=>setStep(2)} style={{...C.btn,background:"#0f172a",color:"#fff"}}><span style={{display:"flex",alignItems:"center",gap:6}}>{I.sparkle} Auto-Categorize</span></button>
      </div>
      <div style={{background:"#f8fafc",padding:16,borderRadius:8,fontSize:12,...C.mono,color:"#475569"}}><p style={{margin:0}}>Column mapping preview:</p><p style={{margin:"4px 0 0",color:"#94a3b8"}}>Date → col 1 | Description → col 3 | Amount → col 5</p></div>
    </div>}
    {step===2&&<div style={C.card}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{display:"flex",alignItems:"center",gap:4,padding:"4px 10px",background:"#eff6ff",borderRadius:8,fontSize:11,color:"#3b82f6",fontWeight:600}}>{I.sparkle} AI-categorized</span>
          <span style={{fontSize:12,color:"#64748b"}}>Click any category to change it</span>
        </div>
        <button style={{...C.btn,background:"#10b981",color:"#fff"}}>Import 6 Transactions</button>
      </div>
      <table style={C.tbl}><thead><tr><th style={C.th}>Date</th><th style={C.th}>Description</th><th style={{...C.th,textAlign:"right"}}>Amount</th><th style={C.th}>Category</th><th style={C.th}>Sub-Category</th><th style={{...C.th,textAlign:"center"}}>Conf.</th></tr></thead>
      <tbody>{rows.map((r,i)=>(<tr key={i} style={{borderBottom:"1px solid #f1f5f9"}}><td style={{...C.td,...C.mono,fontSize:12}}>{r.d}</td><td style={{...C.td,fontWeight:500}}>{r.desc}</td><td style={{...C.td,textAlign:"right",...C.mono,fontWeight:600,color:r.amt>0?"#10b981":"#0f172a"}}>{r.amt>0?"+":""}{fmt(Math.abs(r.amt))}</td><td style={C.td}><span style={{fontSize:11,color:"#64748b"}}>{r.cat}</span></td><td style={C.td}><span style={{...C.cb,cursor:"pointer",borderBottom:"1px dashed #94a3b8"}}>{r.sub}</span></td><td style={{...C.td,textAlign:"center"}}><span style={{fontSize:11,fontWeight:600,...C.mono,color:r.c>.9?"#10b981":r.c>.7?"#f59e0b":"#ef4444"}}>{Math.round(r.c*100)}%</span></td></tr>))}</tbody></table>
    </div>}
  </div>);
}

// === SETTINGS ===
function SettingsPage(){
  return(<div>
    <h1 style={{fontSize:22,fontWeight:700,color:"#0f172a",marginBottom:24}}>Settings</h1>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
      <div style={C.card}><h3 style={{fontSize:14,fontWeight:700,color:"#0f172a",margin:"0 0 4px"}}>Accounts</h3><p style={{fontSize:13,color:"#64748b",marginBottom:12}}>Each account has an owner and classification for filtering and net worth.</p>
        <table style={C.tbl}><thead><tr><th style={C.th}>Account</th><th style={C.th}>Owner</th><th style={C.th}>Type</th><th style={C.th}>Class</th></tr></thead>
        <tbody>{MOCK_ACCOUNTS.map(a=>(<tr key={a.id} style={{borderBottom:"1px solid #f1f5f9",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <td style={{...C.td,fontWeight:500}}>{a.name} {a.lastFour&&<span style={{color:"#94a3b8",fontSize:11}}>({a.lastFour})</span>}</td>
          <td style={C.td}><span style={{fontSize:11,padding:"2px 8px",borderRadius:6,background:a.owner==="Robert"?"#dbeafe":"#fce7f3",color:a.owner==="Robert"?"#2563eb":"#db2777"}}>{a.owner}</span></td>
          <td style={{...C.td,fontSize:12,color:"#64748b",textTransform:"capitalize"}}>{a.type}</td>
          <td style={C.td}><span style={{fontSize:11,padding:"2px 8px",borderRadius:6,textTransform:"capitalize",background:a.classification==="liquid"?"#d1fae5":a.classification==="investment"?"#ede9fe":"#fef2f2",color:a.classification==="liquid"?"#059669":a.classification==="investment"?"#7c3aed":"#dc2626"}}>{a.classification}</span></td>
        </tr>))}</tbody></table>
        <button style={{...C.btn,background:"#f1f5f9",color:"#334155",marginTop:12,width:"100%"}}><span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>{I.plus} Add Account</span></button>
      </div>
      <div style={C.card}><h3 style={{fontSize:14,fontWeight:700,color:"#0f172a",margin:"0 0 4px"}}>Categories</h3><p style={{fontSize:13,color:"#64748b",marginBottom:12}}>Parent categories group sub-categories for budgets and reports.</p>
        <div style={{maxHeight:400,overflowY:"auto"}}>{CATEGORIES.map(g=>(<div key={g.group} style={{marginBottom:8}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:`2px solid ${COLORS[g.group]||"#e2e8f0"}30`}}>
            <span style={{fontWeight:700,fontSize:12,color:"#334155",display:"flex",alignItems:"center",gap:6}}><span style={{width:6,height:6,borderRadius:1,background:COLORS[g.group]||"#94a3b8"}}/>{g.group}</span>
            <span style={{fontSize:11,color:"#94a3b8"}}>{g.subs.length} subs</span>
          </div>
          {g.subs.map(s=>(<div key={s.name} style={{display:"flex",justifyContent:"space-between",padding:"3px 0 3px 18px",fontSize:12,color:"#64748b"}}><span>{s.name}</span>{s.budget>0&&<span style={{...C.mono,fontSize:11,color:"#94a3b8"}}>{fmt(s.budget)}/mo</span>}</div>))}
        </div>))}</div>
        <button style={{...C.btn,background:"#f1f5f9",color:"#334155",marginTop:12,width:"100%"}}><span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>{I.plus} Add Category</span></button>
      </div>
    </div>
  </div>);
}

// === APP ===
const NAV=[{k:"dashboard",l:"Dashboard",i:I.dashboard},{k:"transactions",l:"Transactions",i:I.transactions},{k:"budget",l:"Budget",i:I.budget},{k:"reports",l:"Reports",i:I.reports},{k:"networth",l:"Net Worth",i:I.networth},{k:"import",l:"Import",i:I.import},{k:"settings",l:"Settings",i:I.settings}];

export default function App(){
  const [page,setPage]=useState("dashboard");
  return(<>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
    <div style={{display:"flex",height:"100vh",background:"#f4f6f9",fontFamily:"'DM Sans', sans-serif"}}>
      <div style={{width:220,background:"#0f172a",display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"20px 20px 16px",borderBottom:"1px solid #1e293b"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:28,height:28,borderRadius:6,background:"linear-gradient(135deg,#3b82f6,#10b981)",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:"#fff",fontSize:14,fontWeight:800,...C.mono}}>$</span></div>
            <span style={{color:"#f1f5f9",fontSize:16,fontWeight:700,letterSpacing:"-0.02em"}}>Ledger</span>
          </div>
        </div>
        <nav style={{flex:1,padding:"12px 10px",display:"flex",flexDirection:"column",gap:2}}>
          {NAV.map(n=>(<button key={n.k} onClick={()=>setPage(n.k)} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:page===n.k?"rgba(59,130,246,0.15)":"transparent",border:"none",borderRadius:8,cursor:"pointer",width:"100%",textAlign:"left",color:page===n.k?"#93c5fd":"#94a3b8",fontWeight:page===n.k?600:400,fontSize:13}} onMouseEnter={e=>{if(page!==n.k)e.currentTarget.style.background="rgba(255,255,255,0.05)";}} onMouseLeave={e=>{if(page!==n.k)e.currentTarget.style.background="transparent";}}>{n.i}{n.l}</button>))}
        </nav>
        <div style={{padding:"12px 16px",borderTop:"1px solid #1e293b",fontSize:11,color:"#475569"}}>v1.0 · Local</div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"28px 36px"}}>
        {page==="dashboard"&&<DashboardPage/>}{page==="transactions"&&<TransactionsPage/>}{page==="budget"&&<BudgetPage/>}{page==="reports"&&<ReportsPage/>}{page==="networth"&&<NetWorthPage/>}{page==="import"&&<ImportPage/>}{page==="settings"&&<SettingsPage/>}
      </div>
    </div>
  </>);
}
