import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = {
  apiKey: "AIzaSyBLgkzpLOXjk-cyhp5usY-S9NJFeYRYg3Q",
  authDomain: "leads-management-tz.firebaseapp.com",
  projectId: "leads-management-tz",
  storageBucket: "leads-management-tz.firebasestorage.app",
  messagingSenderId: "415409819020",
  appId: "1:415409819020:web:0c94cf5514d099479d5aa9",
  measurementId: "G-J0HHE95DXB"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkDuplicates() {
  const leadsRef = collection(db, "leads");
  const snapshot = await getDocs(leadsRef);
  
  const phoneMap = {};
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const phone = data.phone ? String(data.phone).replace(/\D/g, '') : '';
    if (phone && phone.length >= 7) {
      if (!phoneMap[phone]) {
        phoneMap[phone] = [];
      }
      phoneMap[phone].push({
        docId: doc.id,
        name: data.name || 'Unknown',
        phone: data.phone,
        stage: data.stage || 'New Lead',
        counselor: data.counselor || 'Unassigned',
        source: data.source || 'Unknown',
        createdDate: data.createdDate || 'N/A'
      });
    }
  });

  const duplicates = Object.entries(phoneMap)
    .filter(([phone, list]) => list.length > 1)
    .map(([phone, list]) => ({
      phone,
      count: list.length,
      records: list
    }));

  const result = {
    totalLeadsScanned: snapshot.docs.length,
    duplicateGroupsCount: duplicates.length,
    duplicates: duplicates
  };

  fs.writeFileSync('d:/Lead-Management/duplicates_result.json', JSON.stringify(result, null, 2));
  console.log("Check complete. Result saved to duplicates_result.json");
  process.exit(0);
}

checkDuplicates().catch(err => {
  fs.writeFileSync('d:/Lead-Management/duplicates_result.json', JSON.stringify({ error: err.message }));
  process.exit(1);
});
