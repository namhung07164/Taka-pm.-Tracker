import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const PARENT_APP_ID = 'taka-projects-app-v1';
  let usersData = [];
  
  try {
     const snap = await getDocs(collection(db, 'artifacts', PARENT_APP_ID, 'public', 'data', 'taka_custom_accounts'));
     usersData = snap.docs.map(d => d.data());
     console.log("taka_custom_accounts", usersData);
  } catch (e) { console.log(e.message); }

  try {
     const snap = await getDocs(collection(db, 'artifacts', PARENT_APP_ID, 'public', 'data', 'taka_users'));
     usersData = snap.docs.map(d => d.data());
     console.log("taka_users", usersData);
  } catch (e) { console.log(e.message); }
  
  try {
     const snap = await getDocs(collection(db, 'users'));
     usersData = snap.docs.map(d => d.data());
     console.log("users", usersData);
  } catch (e) { console.log(e.message); }

  process.exit(0);
}
check();
