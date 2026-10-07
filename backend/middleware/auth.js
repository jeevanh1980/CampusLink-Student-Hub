// backend/middleware/auth.js

const jwt = require('jsonwebtoken');

// A (bad) placeholder secret. You should replace this!
// Put 'YOUR_REALLY_SECRET_KEY_GOES_HERE' in a .env file later.
const JWT_SECRET = "your_super_secret_key_that_no_one_knows";

module.exports = function(req, res, next) {
    // 1. Get token from header
    const token = req.header('Authorization');

    // 2. Check if no token
    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // 3. Token exists, but it's formatted as "Bearer [token]"
    // We need to split it and get only the token part
    const tokenParts = token.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
         return res.status(401).json({ message: 'Token is not valid (must be Bearer)' });
    }
    
    const actualToken = tokenParts[1];

    // 4. Verify the token
    try {
        const decoded = jwt.verify(actualToken, JWT_SECRET);
        
        // 5. Add user from payload to the request object
        // This makes req.user available in all our protected routes
        req.user = decoded.user; 
        next(); // Move on to the next middleware or route handler

    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};