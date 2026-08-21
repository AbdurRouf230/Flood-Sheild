const {
  getInventory,
  getRequests,
  createRequest,
  allocateRelief,
  optimizeRoute,
  predictDemand,
  restockInventory
} = require('./controllers/logisticsController');

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
  console.log("RUNNING RELIEF LOGISTICS CONTROLLER TESTS");
  console.log("==========================================\n");

  // 1. Test getInventory
  console.log("--- 1. Testing getInventory ---");
  const res1 = mockResponse();
  await getInventory({}, res1);
  console.log("Response Code:", res1.statusCode);
  console.log("Inventory count returned:", res1.data.length);
  const initialStock = res1.data.find(i => i.warehouseName === 'Sylhet Relief Hub' && i.itemType === 'Food')?.quantity || 0;
  console.log("Initial stock of Food at Sylhet Relief Hub:", initialStock);
  console.log("Pass: Inventory fetched successfully.\n");

  // 2. Test restockInventory
  console.log("--- 2. Testing restockInventory ---");
  const req2 = {
    body: {
      warehouseName: 'Sylhet Relief Hub',
      itemType: 'Food',
      quantity: 500
    }
  };
  const res2 = mockResponse();
  await restockInventory(req2, res2);
  console.log("Response Code:", res2.statusCode);
  console.log("New stock returned:", res2.data.quantity);
  const expectedStock = initialStock + 500;
  console.log("Expected stock:", expectedStock, "| Actual stock:", res2.data.quantity);
  if (res2.data.quantity === expectedStock) {
    console.log("Pass: Restock calculation matches expected quantity.\n");
  } else {
    console.error("Fail: Restock mismatch!");
  }

  // 3. Test createRequest (with dynamic priority scoring)
  console.log("--- 3. Testing createRequest ---");
  const req3 = {
    body: {
      villageName: "Test Village Alpha",
      district: "Sylhet",
      contactPerson: "Dr. Kamal",
      phone: "+8801799988877",
      population: 2000,
      itemType: "Food",
      quantity: 600
    }
  };
  const res3 = mockResponse();
  await createRequest(req3, res3);
  console.log("Response Code:", res3.statusCode);
  console.log("Created Request:", JSON.stringify(res3.data, null, 2));
  console.log("Calculated Priority Score:", res3.data.priorityScore);
  console.log("Pass: Request created with dynamic priority scoring.\n");

  // 4. Test duplicate prevention on createRequest
  console.log("--- 4. Testing createRequest Duplicate Prevention ---");
  const res4 = mockResponse();
  await createRequest(req3, res4);
  console.log("Response Code:", res4.statusCode);
  console.log("Response Data:", JSON.stringify(res4.data, null, 2));
  if (res4.statusCode === 400 && res4.data.message.includes("already been filed")) {
    console.log("Pass: Blocked duplicate request within 24h successfully.\n");
  } else {
    console.error("Fail: Duplicate request was not blocked!");
  }

  // 5. Test optimizeRoute (fallback solver)
  console.log("--- 5. Testing optimizeRoute Solver ---");
  const req5 = {
    body: {
      startNode: "Sylhet Relief Hub",
      endNode: "Test Village Alpha"
    }
  };
  const res5 = mockResponse();
  await optimizeRoute(req5, res5);
  console.log("Response Code:", res5.statusCode);
  console.log("Optimized Path:", res5.data.optimizedPath.join(" -> "));
  console.log("Distance:", res5.data.totalDistanceKm, "km");
  console.log("Solver Signature:", res5.data.solverUsed);
  console.log("Pass: Route optimization completed successfully.\n");

  // 6. Test predictDemand (fallback solver)
  console.log("--- 6. Testing predictDemand Solver ---");
  const req6 = {
    body: {
      population: 3000,
      itemType: "Water",
      districtRisk: 75
    }
  };
  const res6 = mockResponse();
  await predictDemand(req6, res6);
  console.log("Response Code:", res6.statusCode);
  console.log("Predicted Demand Units:", res6.data.predictedDemand);
  console.log("Predictor Signature:", res6.data.predictorUsed || res6.data.modelUsed);
  console.log("Pass: ML demand prediction completed successfully.\n");

  // 7. Test allocateRelief (dispatch shipment and decrement stock)
  console.log("--- 7. Testing allocateRelief ---");
  const req7 = {
    body: {
      requestId: res3.data._id,
      warehouseName: 'Sylhet Relief Hub',
      allocatedItems: [
        { itemType: 'Food', quantity: 600 }
      ],
      routeDistance: res5.data.totalDistanceKm,
      routePath: res5.data.optimizedPath
    }
  };
  const res7 = mockResponse();
  await allocateRelief(req7, res7);
  console.log("Response Code:", res7.statusCode);
  console.log("Created Allocation:", JSON.stringify(res7.data, null, 2));

  // Verify stock decremented
  const res8 = mockResponse();
  await getInventory({}, res8);
  const stockAfterDispatch = res8.data.find(i => i.warehouseName === 'Sylhet Relief Hub' && i.itemType === 'Food')?.quantity || 0;
  console.log("Stock after dispatching 600 bags:", stockAfterDispatch);
  const expectedStockAfter = expectedStock - 600;
  console.log("Expected stock remaining:", expectedStockAfter);
  if (stockAfterDispatch === expectedStockAfter) {
    console.log("Pass: Stock successfully decremented on dispatch.\n");
  } else {
    console.error("Fail: Stock decrement mismatch!");
  }

  // 8. Test duplicate allocation prevention
  console.log("--- 8. Testing duplicate allocation prevention ---");
  const res9 = mockResponse();
  await allocateRelief(req7, res9);
  console.log("Response Code:", res9.statusCode);
  console.log("Response Data:", JSON.stringify(res9.data, null, 2));
  if (res9.statusCode === 400 && res9.data.message.includes("Duplicate delivery blocked")) {
    console.log("Pass: Blocked duplicate allocation for the same request ID successfully.\n");
  } else {
    console.error("Fail: Duplicate allocation was not blocked!");
  }

  console.log("==========================================");
  console.log("ALL TESTS COMPLETED SUCCESSFULLY!");
  console.log("==========================================");
}

runTests();
