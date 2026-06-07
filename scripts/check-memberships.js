const mongoose = require("mongoose");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../.env.local") });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected");
  const db = mongoose.connection.db;
  
  const memberships = await db.collection("roommemberships").find({}).toArray();
  console.log("All memberships:", memberships);
  
  mongoose.disconnect();
}
run();
