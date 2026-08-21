const { reportIncident } = require('./controllers/incidentController');
const fs = require('fs');
const path = require('path');

// Mock request and response
const req = {
  body: {
    title: "Test Flood",
    district: "Sylhet",
    type: "Flooded Road",
    desc: "Test description of a flooded road.",
    lat: "24.8949",
    lng: "91.8687",
    image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", // minimal base64 image
    video: null
  },
  user: {
    name: "Test User",
    uid: "test_uid_123"
  }
};

const res = {
  status: function(code) {
    this.statusCode = code;
    return this;
  },
  json: function(data) {
    console.log("Response Code:", this.statusCode || 200);
    console.log("Response Data:", JSON.stringify(data, null, 2));
  }
};

async function test() {
  console.log("Running controller test...");
  await reportIncident(req, res);
}

test();
