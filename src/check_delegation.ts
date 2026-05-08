import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const PARENT_APP_ID = 'taka-projects-app-v1';
  try {
     const snap = await getDocs(collection(db, 'artifacts', PARENT_APP_ID, 'public', 'data', 'taka_delegation_groups'));
     const docs = snap.docs.map(d => {
       const subTasks = d.data().subTasks || [];
       return { 
         id: d.id, 
         actStatus: d.data().actStatus, 
         plStatus: d.data().plStatus,
         subTasksActStatus: subTasks.map((s:any) => s.actStatus),
         subTasksPlStatus: subTasks.map((s:any) => s.plStatus)
       }
     });
     console.log('taka_delegation_groups:', JSON.stringify(docs.slice(0, 5), null, 2));
  } catch (e) {
     console.log('Error', e);
  }
  process.exit(0);
}
check();
