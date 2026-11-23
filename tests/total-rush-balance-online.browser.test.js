"use strict";
process.env.TOTAL_RUSH_TEST_BALANCE=JSON.stringify({boulderTerritoryRate:.25,boulderBonusRate:1.5,middleRingPoints:15,highRingPoints:25,goldenReward:50,goldenHealth:192,goldenRespawn:90,ballCount:5});
require("./total-rush-online.browser.test.js");
