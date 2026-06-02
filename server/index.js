const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const connectDB = require('./config/db');
const User = require('./models/User');
const errorHandler = require('./middleware/errorHandler');

dotenv.config({ path: path.join(__dirname, '.env'), override: true });

const app = express();
const server = http.createServer(app);

// ✅ Allowed origins (IMPORTANT FIX)
const allowedOrigins = [
  "http://localhost:5173",
  "https://civic-issue-blue.vercel.app"
];

// ✅ Socket.io CORS FIX
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

app.set('io', io);

// Socket connection
io.on('connection', (socket) => {
  socket.on('joinUserRoom', (userId) => {
    if (userId) socket.join(`user:${userId}`);
  });
});

// ✅ Express CORS FIX
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/issues', require('./routes/issues'));
app.use('/api/detect', require('./routes/detect'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/users', require('./routes/users'));
app.use('/api/notifications', require('./routes/notifications'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Civic Report API running' });
});

// Error handler
app.use(errorHandler);

const BASE_PORT = parseInt(process.env.PORT || '5000', 10);
const ACTIVE_PORT_FILE = path.join(__dirname, '..', '.active-port');

const listenOnPort = (port) => new Promise((resolve, reject) => {
  server.listen(port, () => resolve({ server, port }));
  server.once('error', (err) => reject(err));
});

const startListeningWithFallback = async (startPort, maxAttempts = 10) => {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const port = startPort + attempt;
    try {
      const { port: activePort } = await listenOnPort(port);
      return activePort;
    } catch (err) {
      if (err.code === 'EADDRINUSE') {
        console.warn(`Port ${port} is busy. Trying ${port + 1}...`);
        continue;
      }
      throw err;
    }
  }

  throw new Error(`No available port found from ${startPort} to ${startPort + maxAttempts - 1}`);
};

// Seed admin
const seedAdminAccount = async () => {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) return;

  const adminName = process.env.ADMIN_NAME?.trim() || 'Admin';
  const shouldResetPassword = process.env.ADMIN_FORCE_PASSWORD_RESET === 'true';

  let admin = await User.findOne({ email: adminEmail });

  if (!admin) {
    await User.create({
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
    });
    console.log(`Seeded admin account for ${adminEmail}`);
    admin = await User.findOne({ email: adminEmail });
  }

  let needsSave = false;

  if (admin.role !== 'admin') {
    admin.role = 'admin';
    needsSave = true;
  }

  if (shouldResetPassword) {
    admin.password = adminPassword;
    needsSave = true;
  }

  if (needsSave) {
    await admin.save();
    console.log(`Updated admin account for ${adminEmail}`);
  }

  await User.updateMany(
    { email: { $ne: adminEmail }, role: 'admin' },
    { $set: { role: 'user' } }
  );
};

// Start server
const startServer = async () => {
  try {
    await connectDB();
    await seedAdminAccount();
    const activePort = await startListeningWithFallback(BASE_PORT);
    fs.writeFileSync(ACTIVE_PORT_FILE, String(activePort));
    console.log(`Server running on port ${activePort} in ${process.env.NODE_ENV} mode`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};

startServer();
