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
     const snap = await getDocs(collection(db, 'artifacts', PARENT_APP_ID, 'public', 'data', 'taka_delegation_groups'));
     usersData = snap.docs.map(d => d.data());
     const subTasks = usersData.flatMap(d => d.subTasks || []);
     console.log(JSON.stringify(subTasks.filter(s => s.actualStatus || s.actStatus || Object.keys(s).some(k => k.toLowerCase().includes('status'))), null, 2));
  } catch (e) {}

  process.exit(0);
}
check();
