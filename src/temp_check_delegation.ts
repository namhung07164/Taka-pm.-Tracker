import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, limit } from 'firebase/firestore';
import * as fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const PARENT_APP_ID = 'taka-projects-app-v1';
  try {
     const q = query(collection(db, 'artifacts', PARENT_APP_ID, 'public', 'data', 'taka_delegation_groups'), limit(3));
     const snap = await getDocs(q);
     const docs = snap.docs.map(d => ({id: d.id, ...d.data()}));
     console.log('taka_delegation_groups:', JSON.stringify(docs, null, 2));
  } catch (e) {
     console.log('Error', e);
  }
  process.exit(0);
}
check();
