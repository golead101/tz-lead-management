import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";

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

async function migrate() {
  console.log("Starting migration...");
  const leadsRef = collection(db, "leads");
  const snapshot = await getDocs(leadsRef);
  
  let count = 0;
  for (const document of snapshot.docs) {
    const id = document.id;
    if (id.startsWith("lead-")) {
      const newId = id.replace("lead-", "");
      
      console.log(`Migrating ${id} -> ${newId}`);
      
      const data = document.data();
      
      if (data.id) {
        data.id = newId;
      }

      // Write to the new ID
      await setDoc(doc(db, "leads", newId), data);
      
      // Delete the old ID
      await deleteDoc(doc(db, "leads", id));
      
      count++;
    }
  }
  
  console.log(`Migration complete! Successfully migrated ${count} leads.`);
  process.exit(0);
}

migrate().catch(console.error);
