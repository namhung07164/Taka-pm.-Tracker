import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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
  const querySnapshot = await getDocs(collection(db, 'artifacts', PARENT_APP_ID, 'public', 'data', 'taka_delegation_groups'));
  const docs = querySnapshot.docs.map(d => d.data());
  console.log(JSON.stringify(docs.slice(0, 5), null, 2));
}

main().catch(console.error);
