import http from 'http';
import { app } from './app.js';
import { connectDB } from './config/db.js';
import { initSocket } from './realtime/socket.js';
import { seedData } from './utils/seedData.js';

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  try {
    await seedData();
  } catch (seedErr) {
    console.warn('[LUBRIX SEED] Seed warning:', seedErr.message);
  }
  const server = http.createServer(app);
  initSocket(server);
  server.listen(PORT, () => {
    console.log(`[LUBRIX] Server running on port ${PORT}`);
  });
}

start().catch(console.error);
