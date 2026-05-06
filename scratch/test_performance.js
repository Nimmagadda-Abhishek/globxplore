/**
 * This is a mock verification script to demonstrate the structure 
 * of the new Attendance & Performance API.
 */

const mockUserStats = [
  {
    _id: "user123",
    name: "John Agent",
    gxId: "GX1001",
    role: "AGENT",
    totalActiveMinutes: 450,
    totalIdleMinutes: 30,
    sessionCount: 2,
    lastHeartbeat: new Date(),
    lastLogin: new Date(),
    status: "active"
  },
  {
    _id: "user456",
    name: "Alice Manager",
    gxId: "AM0001",
    role: "AGENT_MANAGER",
    totalActiveMinutes: 300,
    totalIdleMinutes: 60,
    sessionCount: 1,
    lastHeartbeat: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
    lastLogin: new Date(),
    status: "idle"
  }
];

const overall = mockUserStats.reduce((acc, curr) => {
  acc.totalSessions += curr.sessionCount;
  acc.totalActiveMinutes += curr.totalActiveMinutes;
  acc.totalIdleMinutes += curr.totalIdleMinutes;
  return acc;
}, {
  totalSessions: 0,
  totalActiveMinutes: 0,
  totalIdleMinutes: 0,
  userCount: mockUserStats.length
});

const response = {
  success: true,
  data: {
    overall,
    individualBreakdown: mockUserStats
  }
};

console.log("--- MOCK API RESPONSE STRUCTURE ---");
console.log(JSON.stringify(response, null, 2));
