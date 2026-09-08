import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function run() {
  try {
    console.log("Testing connection...");
    await getDocFromServer(doc(db, "test", "connection"));
    console.log("Connection successful");
  } catch (error) {
    console.log("Error type:", error.constructor.name);
    console.log("Error message:", error.message);
  }
}
run();
