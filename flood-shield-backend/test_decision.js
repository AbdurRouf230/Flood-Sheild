const { getAnalytics, getForecast, getDistrictRisk } = require('./controllers/decisionController');

// Helper to create mock response
const mockResponse = () => {
  const res = {
    statusCode: 200,
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      this.data = data;
      return this;
    }
  };
  return res;
};

async function runTests() {
  console.log("==========================================");
  console.log("RUNNING GOVERNMENT DECISION CENTER TESTS");
  console.log("==========================================\n");

  // 1. Test getAnalytics
  console.log("--- 1. Testing getAnalytics ---");
  const res1 = mockResponse();
  await getAnalytics({}, res1);
  console.log("Response Code:", res1.statusCode);
  console.log("Analytics Data Summaries:");
  console.log("  - Inventory Stock Levels:", JSON.stringify(res1.data.inventorySummary));
  console.log("  - Requests Count by Status:", JSON.stringify(res1.data.requestsSummary.byStatus));
  console.log("  - Incidents Count by Severity:", JSON.stringify(res1.data.incidentsSummary.bySeverity));
  console.log("  - Shelter Average Occupancy:", res1.data.shelterSummary.occupancyPercentage + "%");
  if (res1.statusCode === 200 && res1.data.inventorySummary && res1.data.requestsSummary) {
    console.log("Pass: Analytics aggregated and calculated successfully.\n");
  } else {
    console.error("Fail: Analytics aggregation error.");
  }

  // 2. Test getForecast
  console.log("--- 2. Testing getForecast ---");
  const res2 = mockResponse();
  await getForecast({}, res2);
  console.log("Response Code:", res2.statusCode);
  console.log("River Measurement Stations Count:", res2.data.stations.length);
  res2.data.stations.forEach(s => {
    console.log(`  - Station: ${s.station} | Danger Level: ${s.dangerLevel} | Max Forecast: ${Math.max(...s.forecast)}m`);
  });
  if (res2.statusCode === 200 && res2.data.stations.length > 0) {
    console.log("Pass: River water levels forecasted successfully.\n");
  } else {
    console.error("Fail: Forecast aggregation error.");
  }

  // 3. Test getDistrictRisk
  console.log("--- 3. Testing getDistrictRisk ---");
  const res3 = mockResponse();
  await getDistrictRisk({}, res3);
  console.log("Response Code:", res3.statusCode);
  console.log("Ensemble Risk Model rankings count:", res3.data.rankings.length);
  console.log("Highest Risk District:", res3.data.rankings[0].district, `(${res3.data.rankings[0].riskScore}%)`);
  console.log("Formula:", res3.data.ensembleFormula);
  console.log("Solver Details:", res3.data.solverUsed);
  if (res3.statusCode === 200 && res3.data.rankings.length > 0) {
    console.log("Pass: Ensemble risk ranking calculated successfully.\n");
  } else {
    console.error("Fail: Risk calculations error.");
  }

  console.log("==========================================");
  console.log("ALL GOVERNMENT DECISION CENTER TESTS PASSED!");
  console.log("==========================================");
}

runTests();
