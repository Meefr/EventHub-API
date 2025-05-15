# Event Management API

## Description

A robust backend API for managing events, bookings, and user authentication. This system allows users to discover events, make bookings, and manage their profiles, while organizers can create and manage events. Built with Node.js, Express, and MongoDB.

## Key Features

- **User Authentication**: Secure JWT-based auth with role-based access control
- **Event Management**: Create, read, update, and delete events with image uploads
- **Booking System**: Users can book tickets for events with availability checks
- **Role-Based Permissions**: Admin, Organizer, and User roles with granular permissions
- **Search & Filtering**: Advanced event search with pagination
- **Cloudinary Integration**: For event image storage and management

## Technologies

- **Backend**: Node.js, Express
- **Database**: MongoDB (with Mongoose ODM)
- **Authentication**: JWT
- **File Storage**: Cloudinary
- **Validation**: express-validator
- **Other**: Multer for file uploads

## API Base URL

The API is deployed on `Vercel` and can be accessed at:  
**`https://event-hub-api-iota.vercel.app`**

### Some Example Endpoints:
- **Authentication**:  
  `POST https://event-hub-api-iota.vercel.app/api/v1/auth/register`  
  `POST https://event-hub-api-iota.vercel.app/api/v1/auth/login`

- **Events**:  
  `GET https://event-hub-api-iota.vercel.app/api/v1/events`  
  `POST https://event-hub-api-iota.vercel.app/api/v1/events`

- **Bookings**:  
  `POST https://event-hub-api-iota.vercel.app/api/v1/bookings`  
  `GET https://event-hub-api-iota.vercel.app/api/v1/bookings`


## Installation for local setup 

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/event-management-api.git
   cd event-management-api
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory with the following variables:

   ```
   PORT=5000
   NODE_ENV=development
   MONGO_URI=mongodb+srv://<username>:<password>@cluster0.jgkzg7o.mongodb.net/cluster0?retryWrites=true&w=majority
   <!-- If you run website locak no need for this  -->
   CLIENT_URL=https://meefr.github.io

   CLOUDINARY_NAME=your_cloudinary_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret

   ```

4. Start the server:
   ```bash
   npm start
   ```

## API Usage

### Authentication

```javascript
// Register a new user
POST /api/v1/auth/register
Body: { "name": "Test", "email": "test@example.com", "password": "test123" }

// Login
POST /api/v1/auth/login
Body: { "email": "test@example.com", "password": "test123" }

// Get current user
GET /api/v1/auth/me
Headers: { "Authorization": "Bearer <token>" }
```

### Events

```javascript
// Get all events (with pagination)
GET /api/v1/events?page=1&limit=10

// Create an event (Organizer/Admin only)
POST /api/v1/events
Headers: { "Authorization": "Bearer <token>" }
Body: {
  "title": "Concert",
  "description": "Music event",
  "date": "2023-12-31",
  "location": "New York",
  "availableTickets": 100,
  "price": 50,
  "tags": ["music", "concert"]
}
```

### Bookings

```javascript
// Create a booking
POST /api/v1/bookings
Headers: { "Authorization": "Bearer <token>" }
Body: { "event": "eventId123", "ticketCount": 2 }

// Get user bookings
GET /api/v1/bookings
Headers: { "Authorization": "Bearer <token>" }
```

## Error Handling

The API returns standardized error responses:

```json
{
  "success": false,
  "error": "Error message",
  "statusCode": 400
}
```

## Security

- JWT authentication with HTTP-only cookies
- Role-based access control
- Input validation for all endpoints
- Password hashing
- Secure headers

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

[MIT](https://choosealicense.com/licenses/mit/)
