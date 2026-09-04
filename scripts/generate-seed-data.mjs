// Generates a large, role-diverse synthetic candidate pool covering the IT/software
// market (engineering, data, infra, security, QA, product, design, IT support, etc.)
// for the Talent Search demo. Deterministic (seeded RNG) so re-runs are reproducible.
//
// Phone numbers use the "555" exchange convention (e.g. +1<area>555<line>) that
// software/media has used for decades to signal "not a real, dialable number" —
// the same convention Faker.js and Hollywood use. Nothing here can be dialed by
// accident; the UI still requires a human to open a dialog and edit/confirm a
// number before any real Hunar call is placed.
//
// Usage: node scripts/generate-seed-data.mjs > src/lib/people-search/seed-data.generated.json

import { writeFileSync } from "node:fs";

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const pickN = (arr, n) => {
  const pool = [...arr];
  const out = [];
  for (let i = 0; i < n && pool.length; i++) {
    out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  }
  return out;
};
const int = (min, max) => Math.floor(rand() * (max - min + 1)) + min;

const FIRST_NAMES = [
  "Aarav","Ananya","Rohan","Priya","Vikram","Ishaan","Diya","Kabir","Meera","Arjun",
  "Liam","Emma","Noah","Olivia","Ethan","Ava","Mason","Sophia","Lucas","Isabella",
  "Wei","Mei","Jian","Xin","Yuki","Sota","Haruto","Aiko","Hana","Ren",
  "Mohammed","Fatima","Ahmed","Layla","Omar","Amina","Youssef","Noor","Karim","Salma",
  "Carlos","Sofia","Diego","Valentina","Mateo","Camila","Santiago","Isabela","Andres","Lucia",
  "Oleksandr","Olena","Dmitri","Anastasia","Ivan","Katarina","Viktor","Elena","Pavel","Irina",
  "Kwame","Amara","Chidi","Ngozi","Kofi","Zainab","Tunde","Amaka","Emeka","Adaeze",
  "James","Charlotte","Benjamin","Amelia","William","Mia","Henry","Harper","Alexander","Evelyn",
  "Erik","Freya","Lars","Ingrid","Magnus","Astrid","Bjorn","Sigrid","Nils","Solveig",
  "Hiroshi","Keiko","Tomás","Beatriz","Jan","Marta","Piotr","Zofia","Stefan","Greta",
];
const LAST_NAMES = [
  "Sharma","Patel","Kumar","Singh","Gupta","Reddy","Iyer","Nair","Rao","Verma",
  "Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Wilson","Anderson",
  "Chen","Wang","Li","Zhang","Liu","Yamamoto","Tanaka","Suzuki","Sato","Watanabe",
  "Al-Farsi","Hassan","Ibrahim","Khan","Ali","Mahmoud","Saleh","Rahman","Aziz","Karimi",
  "Rodriguez","Martinez","Fernandez","Lopez","Gonzalez","Perez","Sanchez","Ramirez","Torres","Flores",
  "Petrov","Volkov","Ivanova","Sokolova","Kuznetsov","Novak","Kowalski","Nowak","Wojcik","Zielinski",
  "Okafor","Adeyemi","Okonkwo","Eze","Nwosu","Mensah","Boateng","Owusu","Asante","Appiah",
  "Taylor","Thomas","Moore","Jackson","Martin","Lee","Clark","Lewis","Walker","Young",
  "Andersen","Larsen","Hansen","Nilsen","Johansson","Lindqvist","Bergstrom","Karlsson","Berg","Holm",
  "Dubois","Moreau","Lefevre","Rousseau","Bernard","Muller","Schmidt","Weber","Fischer","Wagner",
];
const CITIES = [
  ["Bengaluru","India"],["Hyderabad","India"],["Pune","India"],["Gurugram","India"],["Chennai","India"],
  ["San Francisco","US"],["Seattle","US"],["Austin","US"],["New York","US"],["Denver","US"],["Boston","US"],
  ["Toronto","Canada"],["Vancouver","Canada"],
  ["London","UK"],["Manchester","UK"],["Berlin","Germany"],["Munich","Germany"],["Amsterdam","Netherlands"],
  ["Paris","France"],["Stockholm","Sweden"],["Warsaw","Poland"],["Lisbon","Portugal"],["Dublin","Ireland"],
  ["Singapore","Singapore"],["Tokyo","Japan"],["Osaka","Japan"],["Seoul","South Korea"],
  ["Sydney","Australia"],["Melbourne","Australia"],
  ["Sao Paulo","Brazil"],["Mexico City","Mexico"],["Buenos Aires","Argentina"],
  ["Lagos","Nigeria"],["Nairobi","Kenya"],["Accra","Ghana"],["Cairo","Egypt"],
  ["Dubai","UAE"],["Tel Aviv","Israel"],["Remote","Remote"],
];
const COMPANY_PREFIX = [
  "Northwind","Vertex","Lumen","Orbital","Cascade","Fjord","Meridian","Continuum","Ridgeline","Baobab",
  "Kioku","Warden","Ledger","Terra","Sora","Echofield","Vela","Lattice","Fenwick","Vantage",
  "Brightline","Hollow","Nimbus","Quantis","Solace","Anchor","Everline","Glasswing","Ironpeak","Junction",
];
const COMPANY_SUFFIX = [
  "Systems","Labs","Cloud","Analytics","Technologies","Robotics","Networks","Dynamics","Software","Digital",
  "Studio","Works","Platform","Solutions","AI",
];

const ROLE_ARCHETYPES = [
  { title: "Frontend Engineer", skills: ["React","TypeScript","Next.js","CSS","Web Performance","Accessibility"], count: 45 },
  { title: "Backend Engineer", skills: ["Node.js","Java","PostgreSQL","REST APIs","Microservices","Kafka"], count: 50 },
  { title: "Full-Stack Engineer", skills: ["React","Node.js","TypeScript","PostgreSQL","GraphQL","Docker"], count: 50 },
  { title: "Mobile Engineer (iOS)", skills: ["Swift","SwiftUI","iOS SDK","Xcode","Core Data","Combine"], count: 20 },
  { title: "Mobile Engineer (Android)", skills: ["Kotlin","Jetpack Compose","Android SDK","Coroutines","Room"], count: 20 },
  { title: "Mobile Engineer (React Native)", skills: ["React Native","TypeScript","Redux","Expo","iOS","Android"], count: 15 },
  { title: "Data Engineer", skills: ["Airflow","dbt","Spark","Snowflake","Python","Data Modeling"], count: 40 },
  { title: "Data Scientist", skills: ["Python","Pandas","Scikit-learn","Statistics","SQL","A/B Testing"], count: 30 },
  { title: "Machine Learning Engineer", skills: ["PyTorch","MLOps","Feature Engineering","Kubernetes","Python"], count: 35 },
  { title: "AI Research Engineer", skills: ["PyTorch","Transformers","CUDA","Research","Distributed Training"], count: 20 },
  { title: "MLOps Engineer", skills: ["MLflow","Kubernetes","CI/CD","Model Serving","Python","Monitoring"], count: 15 },
  { title: "Analytics Engineer", skills: ["dbt","SQL","Looker","Data Warehousing","BigQuery"], count: 15 },
  { title: "DevOps Engineer", skills: ["Terraform","Kubernetes","CI/CD","Docker","AWS","GitHub Actions"], count: 45 },
  { title: "Site Reliability Engineer", skills: ["SRE","Prometheus","Incident Response","Kubernetes","On-call","Go"], count: 25 },
  { title: "Cloud Engineer (AWS)", skills: ["AWS","Terraform","Lambda","VPC","CloudFormation","IAM"], count: 30 },
  { title: "Cloud Engineer (Azure)", skills: ["Azure","ARM Templates","AKS","Azure DevOps","PowerShell"], count: 15 },
  { title: "Platform Engineer", skills: ["Kubernetes","Internal Developer Platforms","Go","Terraform","Helm"], count: 20 },
  { title: "Systems Administrator", skills: ["Linux","Windows Server","Active Directory","Bash","Networking"], count: 20 },
  { title: "Network Engineer", skills: ["Cisco","BGP","VLANs","Firewalls","Network Security","SD-WAN"], count: 15 },
  { title: "Database Administrator", skills: ["PostgreSQL","MySQL","Replication","Performance Tuning","Backups"], count: 15 },
  { title: "QA Automation Engineer / SDET", skills: ["Selenium","Playwright","Cypress","Test Automation","CI/CD"], count: 35 },
  { title: "Manual QA Engineer", skills: ["Test Planning","Regression Testing","Bug Tracking","Jira","QA Process"], count: 15 },
  { title: "Performance Test Engineer", skills: ["JMeter","Load Testing","Gatling","Performance Tuning"], count: 10 },
  { title: "Security Engineer", skills: ["Application Security","Penetration Testing","Threat Modeling","Python"], count: 30 },
  { title: "SOC Analyst", skills: ["SIEM","Incident Response","Threat Detection","Splunk","Network Security"], count: 15 },
  { title: "Cloud Security Engineer", skills: ["AWS Security","IAM","SOC2","Compliance","Terraform"], count: 10 },
  { title: "IT Support Specialist", skills: ["Helpdesk","Windows","macOS","Active Directory","Ticketing Systems"], count: 20 },
  { title: "IT Systems Analyst", skills: ["ITIL","Systems Analysis","SQL","Business Process","Documentation"], count: 15 },
  { title: "Solutions Architect", skills: ["System Design","AWS","Microservices","Stakeholder Management"], count: 20 },
  { title: "Enterprise Architect", skills: ["Enterprise Architecture","TOGAF","System Integration","Roadmapping"], count: 10 },
  { title: "Engineering Manager", skills: ["Engineering Leadership","1:1s","Roadmapping","Hiring","Agile"], count: 25 },
  { title: "Technical Product Manager", skills: ["Product Strategy","APIs","Roadmapping","SQL","Stakeholder Mgmt"], count: 25 },
  { title: "Product Manager", skills: ["Product Strategy","User Research","Roadmapping","A/B Testing","Agile"], count: 20 },
  { title: "UX Designer", skills: ["Figma","User Research","Wireframing","Prototyping","Usability Testing"], count: 20 },
  { title: "UI Designer", skills: ["Figma","Design Systems","Visual Design","Prototyping","Typography"], count: 15 },
  { title: "UX Researcher", skills: ["User Research","Usability Testing","Interviews","Survey Design"], count: 10 },
  { title: "Blockchain Developer", skills: ["Solidity","Ethereum","Smart Contracts","Web3.js","Rust"], count: 10 },
  { title: "Game Developer", skills: ["Unity","C#","Unreal Engine","Game Physics","3D Math"], count: 10 },
  { title: "Embedded Systems Engineer", skills: ["C","Embedded C++","RTOS","Firmware","Microcontrollers"], count: 15 },
  { title: "IoT Engineer", skills: ["IoT Protocols","Embedded C","MQTT","Edge Computing","Sensors"], count: 10 },
  { title: "AR/VR Engineer", skills: ["Unity","C#","ARKit","ARCore","3D Graphics"], count: 8 },
  { title: "RPA Developer", skills: ["UiPath","Automation Anywhere","Process Mining","VBA","Python"], count: 10 },
  { title: "ERP Consultant (SAP)", skills: ["SAP","ABAP","ERP Implementation","Business Process","S/4HANA"], count: 10 },
  { title: "Salesforce Developer", skills: ["Salesforce","Apex","Lightning Components","SOQL","Integrations"], count: 12 },
  { title: "Voice AI / Conversational Engineer", skills: ["Speech Recognition","TTS","LLM Agents","Real-time Audio"], count: 12 },
  { title: "Prompt / AI Solutions Engineer", skills: ["LLM Agents","Prompt Engineering","RAG","Python","APIs"], count: 15 },
  { title: "Developer Advocate", skills: ["Technical Writing","Public Speaking","API Design","Community"], count: 8 },
  { title: "Technical Writer", skills: ["Technical Writing","API Documentation","Markdown","Docs-as-Code"], count: 8 },
  { title: "Scrum Master / Agile Coach", skills: ["Scrum","Agile Coaching","Facilitation","Jira","Kanban"], count: 10 },
  { title: "Business Analyst (IT)", skills: ["Requirements Gathering","SQL","Process Mapping","Stakeholder Mgmt"], count: 12 },
  { title: "Sales Engineer", skills: ["Solution Selling","Technical Demos","APIs","Customer Success"], count: 10 },
  { title: "Technical Recruiter", skills: ["Technical Recruiting","Sourcing","ATS","Interview Design"], count: 10 },
];

const SUMMARY_TEMPLATES = [
  "{years}+ years building {domain} systems; strongest in {s1} and {s2}.",
  "Focused on {domain} for the last {years} years, with deep hands-on experience in {s1}.",
  "Owns {domain} initiatives end to end; particularly strong with {s1} and {s2}.",
  "{years} years of experience across {domain}, most recently working heavily with {s1}.",
  "Specializes in {domain}, with a track record of shipping {s1}-based systems at scale.",
];

function titleCase(s) {
  return s.replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1));
}

function domainFromTitle(title) {
  return title.replace(/\s*\(.*\)/, "").toLowerCase();
}

let seq = 1;
const records = [];

for (const archetype of ROLE_ARCHETYPES) {
  for (let i = 0; i < archetype.count; i++) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const name = `${first} ${last}`;
    const [city, country] = pick(CITIES);
    const years = int(2, 15);
    const skills = pickN(archetype.skills, Math.min(archetype.skills.length, int(4, 6)));
    const company = `${pick(COMPANY_PREFIX)} ${pick(COMPANY_SUFFIX)}`;
    const seniority = years >= 10 ? "Staff " : years >= 6 ? "Senior " : years >= 3 ? "" : "Junior ";
    const title = `${seniority}${archetype.title}`.trim();
    const domain = domainFromTitle(archetype.title);
    const template = pick(SUMMARY_TEMPLATES);
    const summary = template
      .replace("{years}", years)
      .replace("{domain}", domain)
      .replace("{s1}", skills[0])
      .replace("{s2}", skills[1] ?? skills[0]);

    const areaCode = int(200, 989);
    const line = String(int(0, 9999)).padStart(4, "0");
    const phone = `+1${areaCode}555${line}`;

    const emailFirst = first.toLowerCase().replace(/[^a-z]/g, "");
    const emailLast = last.toLowerCase().replace(/[^a-z]/g, "");

    records.push({
      externalId: `seed-${String(seq).padStart(4, "0")}`,
      name,
      title,
      company,
      location: country === "Remote" ? "Remote" : `${city}, ${country}`,
      email: `${emailFirst}.${emailLast}@example.com`,
      phone,
      yearsExperience: years,
      skills,
      summary,
    });
    seq++;
  }
}

writeFileSync(
  new URL("../src/lib/people-search/seed-data.generated.json", import.meta.url),
  JSON.stringify(records, null, 2)
);

console.log(`Generated ${records.length} candidate profiles across ${ROLE_ARCHETYPES.length} role archetypes.`);
