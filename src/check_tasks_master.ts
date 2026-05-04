import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc } from 'firebase/firestore';
import * as fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const PARENT_APP_ID = 'taka-projects-app-v1';
  let usersData: any[] = [];
  
  try {
     const snap = await getDocs(collection(db, 'artifacts', PARENT_APP_ID, 'public', 'data', 'taka_projects'));
     usersData = snap.docs.map(d => d.data());
     const tasks = usersData.flatMap(p => p.tasks || []);
     console.log(JSON.stringify(tasks.filter(t => t.actualStatus || t.status === 'Critical Delay').slice(0,2), null, 2));
  } catch (e) {}

  process.exit(0);
}
check();
