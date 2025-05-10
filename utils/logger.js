// const winston = require('winston');
// const fs = require('fs');
// const path = require('path');

// // Ensure logs directory exists
// const logDir = 'logs';
// if (!fs.existsSync(logDir)) {
//   try {
//     fs.mkdirSync(logDir, { recursive: true });
//   } catch (err) {
//     console.error('Could not create logs directory:', err);
//     process.exit(1);
//   }
// }

// const logger = winston.createLogger({
//   level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
//   format: winston.format.combine(
//     winston.format.timestamp({
//       format: 'YYYY-MM-DD HH:mm:ss'
//     }),
//     winston.format.errors({ stack: true }),
//     winston.format.splat(),
//     winston.format.json()
//   ),
//   defaultMeta: { service: 'event-management-api' },
//   transports: [
//     new winston.transports.File({ 
//       filename: path.join(logDir, 'error.log'), 
//       level: 'error' 
//     }),
//     new winston.transports.File({ 
//       filename: path.join(logDir, 'combined.log') 
//     })
//   ]
// });

// // Console logging in development
// if (process.env.NODE_ENV !== 'production') {
//   logger.add(new winston.transports.Console({
//     format: winston.format.combine(
//       winston.format.colorize(),
//       winston.format.simple()
//     )
//   }));
// }

// module.exports = logger;