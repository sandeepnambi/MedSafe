import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB, getModel } from './config/db.js';
import './models/Schemas.js';

dotenv.config();

async function run() {
  await connectDB();
  const User = getModel('User');
  const Pharmacy = getModel('Pharmacy');
  const VerificationReport = getModel('VerificationReport');

  console.log('--- USERS ---');
  const users = await User.find({});
  users.forEach(u => {
    console.log(`ID: ${u._id}, Name: ${u.name}, Email: ${u.email}, Role: ${u.role}`);
  });

  console.log('\n--- PHARMACIES ---');
  const pharmacies = await Pharmacy.find({});
  pharmacies.forEach(p => {
    console.log(`ID: ${p._id}, Name: ${p.name}, Status: ${p.status}, AssignedName: ${p.assignedExecutiveName}, AssignedId: ${p.assignedExecutiveId}, isLaunched: ${p.isLaunched}`);
  });

  console.log('\n--- VERIFICATION REPORTS ---');
  const reports = await VerificationReport.find({});
  reports.forEach(r => {
    console.log(`ID: ${r._id}, PharmacyId: ${r.pharmacyId}, ExecutiveName: ${r.executiveName}, Recommendation: ${r.recommendation}`);
  });

  mongoose.connection.close();
}

run().catch(console.error);
