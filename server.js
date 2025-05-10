const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = require('./app');
const connectDB = require('./config/db');


// Connect to database

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB(); // wait for DB connection
    const server = app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });

    // Graceful shutdown on unhandled rejections
    process.on('unhandledRejection', (err) => {
      console.error(`Unhandled Rejection: ${err.message}`);
      server.close(() => process.exit(1));
    });

  } catch (err) {
    console.error('Failed to connect to DB:', err);
    process.exit(1);
  }
};

startServer(); // <- start it all

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  // logger.error(`Error: ${err.message}`);
  console.error(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});