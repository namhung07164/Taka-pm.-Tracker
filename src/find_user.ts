import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const PARENT_APP_ID = 'taka-projects-app-v1';
  
  const cols = ['taka_users', 'taka_custom_accounts', 'taka_sub_app_users'];
  for (const c of cols) {
    try {
      const snap = await getDocs(collection(db, 'artifacts', PARENT_APP_ID, 'public', 'data', c));
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const found = docs.filter(d => JSON.stringify(d).includes('HR-NHU'));
      if (found.length > 0) {
        console.log(`Found in ${c}:`, found.map(f => f.username || f.name || f.id));
      } else {
        console.log(`Not in ${c}. Total keys:`, docs.length);
      }
    } catch (e) {
      console.log(`Error in ${c}:`, e);
    }
  }

  // Also check native users collection
  try {
     const snap = await getDocs(collection(db, 'users'));
     const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
     const found = docs.filter(d => JSON.stringify(d).includes('HR-NHU'));
     if (found.length > 0) {
       console.log(`Found in master users:`, found.map(f => f.username || f.name || f.id));
     } else {
       console.log(`Not in master users. Total keys:`, docs.length);
     }
  } catch (e) {}

  process.exit(0);
}
check();
