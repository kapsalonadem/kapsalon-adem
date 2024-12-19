const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'kapsalon-adem-secret-key-2024';
const JWT_EXPIRY = '24h';

const createToken = (user) => {
    return jwt.sign(
        { 
            id: user.id, 
            username: user.username,
            role: 'admin'
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
    );
};

const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
};

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const decoded = verifyToken(token);
        if (!decoded) {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }

        req.user = decoded;
        next();
    } catch (error) {
        console.error('Auth error:', error);
        res.status(401).json({ message: 'Authentication failed' });
    }
};

const setCookieOptions = (req) => {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/',
        domain: req.hostname.includes('localhost') ? 'localhost' : '.netlify.app'
    };
};

module.exports = {
    createToken,
    verifyToken,
    authMiddleware,
    setCookieOptions
};
