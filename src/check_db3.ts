import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  "projectId": "taka---projec-1",
  "appId": "1:1016991080794:web:c447d870815a5ea2135363",
  "apiKey": "AIzaSyCsL4MZ76PLxV5-n0BHHLyb5dR_p5UmvTc",
  "authDomain": "taka---projec-1.firebaseapp.com"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  const PARENT_APP_ID = 'taka-projects-app-v1';
  // Let's get "users" from the master app artifact as well?
  const usersRef = collection(db, 'artifacts', PARENT_APP_ID, 'public', 'data', 'users');
  const snap = await getDocs(usersRef);
  console.log(snap.docs.map(d => d.data()));
}

main().catch(console.error);
