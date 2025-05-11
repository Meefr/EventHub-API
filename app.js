const express = require("express");
const path = require("path");
const morgan = require("morgan");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const i18next = require("i18next");
const i18nextMiddleware = require("i18next-http-middleware");
const dotenv = require("dotenv");
dotenv.config( );
// Import middleware
const errorHandler = require("./middlewares/errorHandler");

// Import routes
const authRoutes = require("./routes/auth");
const eventRoutes = require("./routes/events");
const bookingRoutes = require("./routes/bookings");
const userRoutes = require("./routes/users");

// Initialize express
const app = express();

// Initialize i18next for multi-language support
i18next.init({
  lng: "en",
  fallbackLng: "en",
  resources: {
    en: {
      common: require("./locales/en/common.json"),
    },
    ar: {
      common: require("./locales/ar/common.json"),
    },
  },
});

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log(process.env.CLIENT_URL);


// Enable CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL, // Explicitly specify your frontend origin
    credentials: true, // Allow credentials (cookies, authorization headers)
  })
);

// Security headers
app.use(helmet());

// Compression
app.use(compression());

// Add i18n middleware
app.use(i18nextMiddleware.handle(i18next));

// Logging middleware in development
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Set static folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Mount routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/events", eventRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1/users", userRoutes);

// Base route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Event Management API is running",
    version: "1.0.0",
  });
});

// Handle 404
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: "Resource not found",
  });
});

// Error handling middleware
app.use(errorHandler);

// app.listen(process.env.PORT || 5000, () => {
//   console.log(
//     `Server running in ${process.env.NODE_ENV} mode on port ${
//       process.env.PORT || 5000
//     }`
//   );
// });

module.exports = app;
