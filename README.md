# Celeste Online Bookstore (E-commerce Platform) - MEAN Stack Project

## Project Overview
Celeste Online Bookstore is a fully functional e-commerce platform that allows users to browse books, add them to a cart, and place orders. The platform is built using the MEAN stack (MongoDB, Express.js, Angular, Node.js) and follows best practices in authentication, database design, and API development. It includes advanced features such as role-based access control, JWT authentication, pagination, and more.

---

## Project Features

### Backend (Node.js + Express.js + MongoDB)
1. **User Authentication and Authorization**
   - Users can register, log in, and log out securely.
   - JWT authentication is implemented for secure access.
   - Role-based access control distinguishes between admin and regular users.

2. **RESTful API Design**
   - Fully implemented RESTful API with endpoints for:
     - User management (registration, login, profile update).
     - Book management (CRUD operations for admins).
     - Cart management (adding/removing books, viewing cart).
     - Order management (placing orders, viewing order history).
     - Review management (submitting, updating, deleting reviews).

3. **Database Design**
   - MongoDB schemas created using Mongoose:
     - Users (name, email, password, role).
     - Books (title, author, price, description, stock, reviews, image URL).
     - Orders (user, books, total price, status).
     - Reviews (user, book, rating, review, createdAt).
   - ERD designed and optimized for efficient querying.

4. **Middleware Implementation**
   - Custom middleware developed for:
     - Authentication (JWT verification).
     - Error handling (centralized error response system).
     - Logging (request logs using `winston`).

5. **Advanced Features**
   - Passwords hashed securely using `bcrypt.js`.
   - Server-side pagination and filtering implemented for book listings.
   - Transactions ensure order placement integrity (reducing stock and creating orders atomically).

6. **File Handling**
   - Admins can upload book covers using `multer`.
   - Static files served efficiently using Express.

7. **Validation**
   - Mongoose validation ensures data integrity:
     - Email format, password strength validation for users.
     - Positive price, stock as integer validation for books.
     - Rating range (1-5) and text limit for reviews.
   - Schema validation implemented with Joi.

---

### Frontend (Angular)
1. **User Interface**
   - Home page displays books with search and filter options.
   - Book details page shows book information, reviews, and add-to-cart functionality.
   - Cart page displays selected books with a checkout option.
   - Order history page allows users to view their past orders.

2. **Authentication**
   - Login and registration forms implemented with proper validation.
   - Angular services manage JWT tokens and user sessions.

3. **API Integration**
   - `HttpClient` used for seamless API communication.
   - Error handling and user-friendly messages displayed appropriately.

4. **Review System**
   - Users who have purchased a book can leave reviews.
   - Reviews are displayed dynamically on the book details page.
   - Users can edit or delete their own reviews.

5. **Advanced Features**
   - Lazy loading implemented for optimized performance.
   - Responsive UI designed using Angular Material and Bootstrap.

---

## Deployment and Optimization
- **Server-Side Pagination:** Ensures efficient database queries and performance.
- **Good UI Practices:** Modern, intuitive, and responsive design.
- **Model Relations & Indexing:** Optimized database relationships and indexes for faster lookups.
- **GitHub Repository:** Hosted publicly with clear commit history and documentation.
- **Cloud Deployment:** Deployed using Heroku and MongoDB Atlas.
- **Personal Branding:** Shared on LinkedIn to showcase development skills.
- **Linting & Code Quality:** Proper linting setup ensures clean and maintainable code.

## BONUS Features Implemented
- **Third-Party Authentication:** Users can register and log in with Google and Facebook.
- **In-App Notifications:** Users receive real-time notifications for order updates.

---

## Additional Features
1. **Payment Integration**
   - Integrated Paymob for secure payments at checkout.
   - Payment information handled securely following best practices.

2. **Email Notifications**
   - Users receive email notifications upon registration, order placement, and order status updates.
   - `nodemailer` used for sending emails.

3. **Advanced Caching**
   - Frequently accessed data (e.g., book list) cached using Redis for better performance.

4. **Real-Time Features**
   - WebSockets implemented for instant admin notifications when new orders are placed.

---

## Project Deliverables
1. **Backend**
   - Fully functional RESTful API documented using Postman.
   - Robust error handling and input validation.
   - Git repository with meaningful commit history.

2. **Frontend**
   - User-friendly and responsive Angular application.
   - Proper state management using Angular services.
   - Git repository with detailed commits.

3. **Documentation**
   - Comprehensive README explaining setup and project features.

4. **Presentation**
   - Live demo showcasing all functionalities.
   - Technical walkthrough of the codebase.

---

## Topics Covered
- RESTful API development with Node.js and Express.js.
- Authentication and authorization with JWT.
- Database management with MongoDB and Mongoose.
- Advanced frontend development with Angular.
- Deployment, payment integration, and real-time features.

## Research Topics Explored
- OAuth2 and social login implementation.
- Logging with Winston & Morgan.
- Rate limiting for API security.
- Full-text search and indexing.
- Role-Based Access Control (RBAC).
- Single active session restriction.
- WebSocket-based real-time updates.
- Cloud deployment strategies.

---

Celeste Online Bookstore is a complete, production-ready MEAN stack project that demonstrates a deep understanding of full-stack development concepts. It is fully deployed and ready for real-world use, with all core e-commerce features implemented successfully.

