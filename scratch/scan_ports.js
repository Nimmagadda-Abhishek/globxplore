const net = require('net');

const host = '18.60.39.199';
const ports = [22, 80, 443, 3000, 5000, 8080, 27017];

async function checkPort(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);
    
    socket.on('connect', () => {
      console.log(`Port ${port} is OPEN`);
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      console.log(`Port ${port} timed out`);
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', (err) => {
      console.log(`Port ${port} is CLOSED (${err.message})`);
      socket.destroy();
      resolve(false);
    });
    
    socket.connect(port, host);
  });
}

async function run() {
  console.log(`Checking host: ${host}`);
  for (const port of ports) {
    await checkPort(port);
  }
}

run();
