import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

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
  let q = query(collection(db, 'artifacts', PARENT_APP_ID, 'public', 'data', 'taka_projects'), where('code', '==', 'HRESG'));
  let snap = await getDocs(q);
  console.log("HRESG exists?", snap.docs.length > 0 ? snap.docs[0].data() : 'no');
}

main().catch(console.error);
