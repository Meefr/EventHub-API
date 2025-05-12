const express = require("express");
const path = require("path");
const morgan = require("morgan");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const i18next = require("i18next");
const i18nextMiddleware = require("i18next-http-middleware");
const dotenv = require("dotenv");
dotenv.config();

// Import middleware
const errorHandler = require("./middlewares/errorHandler");

// const cloudinary = require("cloudinary").v2;
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });
// Import routes
const authRoutes = require("./routes/auth");
const eventRoutes = require("./routes/events");
const bookingRoutes = require("./routes/bookings");
const userRoutes = require("./routes/users");
const connectDB = require("./config/db");

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
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// Body parser
// Enable CORS
// app.use(
//   cors({
//     origin: process.env.CLIENT_URL,
//     credentials: true,
//   })
// );
const allowedOrigins = [process.env.CLIENT_URL, 'http://localhost:5173'];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
console.log(allowedOrigins);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log(process.env.CLIENT_URL);

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

app.listen(process.env.PORT, () => {
  connectDB();
  console.log(
    `Server running in ${process.env.NODE_ENV} mode on port ${process.env.PORT}`
  );
});
module.exports = app;
