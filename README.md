# Infinity Bank Website

A modern, responsive banking website built with Node.js, Express, MongoDB, and modern frontend technologies. This project implements a complete digital banking solution with user authentication, transaction management, loan applications, and card management.

## 🚀 Features

### Core Banking Features
- **User Authentication**: Secure login/signup with JWT tokens
- **Account Management**: User profiles, account balances, and account numbers
- **Transaction Management**: Money transfers, deposits, withdrawals, and transaction history
- **Loan Applications**: Personal, home, business, education, and vehicle loans
- **Card Management**: Credit and debit card applications and management
- **UPI Integration**: Link multiple bank accounts for seamless payments

### Technical Features
- **Modern UI/UX**: Responsive design with GSAP animations
- **Security**: Password encryption, JWT authentication, rate limiting
- **Performance**: Optimized loading, lazy loading, and caching
- **Accessibility**: WCAG 2.1 compliant design
- **Cross-browser**: Compatible with all modern browsers

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Express Validator** - Input validation

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with CSS variables
- **JavaScript (ES6+)** - Modern JavaScript features
- **GSAP** - Professional animations
- **Font Awesome** - Icons
- **Google Fonts** - Typography

### Security
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - API protection
- **Input Validation** - XSS and injection protection

## 📋 Prerequisites

Before running this project, make sure you have the following installed:

- **Node.js** (v16 or higher)
- **MongoDB** (v4.4 or higher)
- **npm** or **yarn** package manager

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd infinity-bank-website
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/infinity-bank
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRES_IN=24h
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system:
   ```bash
   # On Windows
   net start MongoDB
   
   # On macOS/Linux
   sudo systemctl start mongod
   ```

5. **Run the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

6. **Access the application**
   Open your browser and navigate to `http://localhost:3000`

## 📁 Project Structure

```
infinity-bank-website/
├── models/                 # MongoDB models
│   ├── User.js            # User model
│   ├── Transaction.js     # Transaction model
│   ├── Loan.js           # Loan model
│   └── Card.js           # Card model
├── routes/                # API routes
│   ├── auth.js           # Authentication routes
│   ├── user.js           # User management routes
│   ├── transaction.js    # Transaction routes
│   ├── loan.js           # Loan routes
│   └── card.js           # Card routes
├── public/                # Static files
│   ├── css/              # Stylesheets
│   ├── js/               # JavaScript files
│   ├── index.html        # Homepage
│   ├── login.html        # Login page
│   ├── signup.html       # Signup page
│   └── dashboard.html    # Dashboard page
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
└── README.md             # Project documentation
```

## 🔧 Configuration

### Database Configuration
The application uses MongoDB as the primary database. Configure the connection in your `.env` file:

```env
MONGODB_URI=mongodb://localhost:27017/infinity-bank
```

### JWT Configuration
Configure JWT settings for authentication:

```env
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h
```

### Security Configuration
Adjust security settings as needed:

```env
BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 📱 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Password reset
- `POST /api/auth/change-password` - Change password
- `GET /api/auth/profile` - Get user profile

### User Management
- `GET /api/user/profile` - Get user profile
- `PATCH /api/user/profile` - Update user profile
- `GET /api/user/balance` - Get account balance
- `GET /api/user/summary` - Get account summary

### Transactions
- `POST /api/transaction/create` - Create transaction
- `GET /api/transaction/history` - Get transaction history
- `GET /api/transaction/:id` - Get transaction details
- `PATCH /api/transaction/:id/cancel` - Cancel transaction

### Loans
- `POST /api/loan/apply` - Apply for loan
- `GET /api/loan/my-loans` - Get user loans
- `GET /api/loan/:id` - Get loan details
- `POST /api/loan/calculator` - Loan calculator

### Cards
- `POST /api/card/apply` - Apply for card
- `GET /api/card/my-cards` - Get user cards
- `GET /api/card/:id` - Get card details
- `PATCH /api/card/:id/toggle-status` - Block/unblock card

## 🎨 Customization

### Styling
The application uses CSS custom properties (variables) for easy theming. Modify the `:root` section in `public/css/style.css`:

```css
:root {
    --primary-color: #2563eb;
    --secondary-color: #64748b;
    --accent-color: #f59e0b;
    /* Add more custom properties */
}
```

### Animations
GSAP animations can be customized in `public/js/main.js`. Modify the animation parameters and timing:

```javascript
gsap.from('.service-card', {
    duration: 1,
    y: 50,
    opacity: 0,
    stagger: 0.2,
    ease: "power2.out"
});
```

## 🔒 Security Features

- **Password Hashing**: Bcrypt with configurable salt rounds
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Comprehensive validation for all inputs
- **Rate Limiting**: Protection against brute force attacks
- **CORS Protection**: Controlled cross-origin requests
- **Security Headers**: Helmet.js for security headers

## 📊 Performance Optimization

- **Lazy Loading**: Images and non-critical resources
- **Compression**: Gzip compression for responses
- **Caching**: Browser and server-side caching
- **Minification**: CSS and JavaScript optimization
- **CDN Integration**: External resource optimization

## 🧪 Testing

Run tests to ensure everything works correctly:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 🚀 Deployment

### Production Build
```bash
# Install production dependencies
npm ci --only=production

# Build the application
npm run build

# Start production server
npm start
```

### Environment Variables
Set production environment variables:

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/infinity-bank
JWT_SECRET=your-production-jwt-secret
PORT=3000
```

### PM2 Deployment
For production deployment with PM2:

```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start server.js --name "infinity-bank"

# Monitor the application
pm2 monit

# View logs
pm2 logs infinity-bank
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/infinity-bank-website/issues) page
2. Create a new issue with detailed information
3. Contact the development team

## 🔮 Future Enhancements

- **Two-Factor Authentication**: SMS/Email OTP verification
- **Real Banking APIs**: Integration with actual banking systems
- **Multi-language Support**: Internationalization (i18n)
- **Push Notifications**: Real-time transaction alerts
- **Mobile App**: React Native or Flutter mobile application
- **AI Chatbot**: Customer support automation
- **Blockchain Integration**: Cryptocurrency support
- **Advanced Analytics**: User behavior and financial insights

## 📊 Project Metrics

- **Lines of Code**: ~2000+
- **Dependencies**: 15+
- **Browser Support**: Chrome, Firefox, Safari, Edge
- **Performance**: <3s load time
- **Accessibility**: WCAG 2.1 AA compliant

## 🏆 Acknowledgments

- **GSAP Team** - For amazing animation library
- **Font Awesome** - For beautiful icons
- **Google Fonts** - For typography
- **MongoDB** - For robust database solution
- **Express.js** - For excellent web framework

---

**Built with ❤️ by the Infinity Bank Development Team**
