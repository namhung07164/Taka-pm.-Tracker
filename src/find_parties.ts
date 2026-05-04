import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const PARENT_APP_ID = 'taka-projects-app-v1';
  try {
     const snap = await getDocs(collection(db, 'artifacts', PARENT_APP_ID, 'public', 'data', 'taka_parties'));
     const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
     console.log('taka_parties', docs);
  } catch (e) {
     console.log('No taka_parties');
  }
  process.exit(0);
}
check();
