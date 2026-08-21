require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const path = require('path');
const mongoose = require('mongoose');
const backendRoot = path.join(__dirname, '..');

const originalLog = console.log;
console.log = (...args) => {
  const text = args.map(String).join(' ');
  if (/mongodb(\+srv)?:\/\//i.test(text)) {
    originalLog('[seed] Connecting to MongoDB (URI redacted)');
    return;
  }
  originalLog(...args);
};

(async () => {
  const { connectDB, getIsConnected } = require(path.join(backendRoot, 'config', 'db'));
  await connectDB();
  if (!getIsConnected()) {
    console.error('MongoDB is not connected. Seed aborted.');
    process.exit(1);
  }
  const dbStore = require(path.join(backendRoot, 'utils', 'dbStore'));
  await dbStore.seedDemoDataToMongo();
  const shelters = await dbStore.findShelters();
  const inventory = await dbStore.findInventory();
  const campaigns = await dbStore.findCampaigns({});
  const warehouses = [...new Set(inventory.map((i) => i.warehouseName))];
  originalLog(JSON.stringify({
    connected: true,
    shelters: shelters.map((s) => `${s.name} [${s.district}]`),
    campaigns: campaigns.map((c) => `${c.campaignId}: ${c.name}`),
    warehouses
  }, null, 2));
  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
