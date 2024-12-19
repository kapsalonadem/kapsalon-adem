const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { authMiddleware } = require('../middleware/auth');
const path = require('path');
const fs = require('fs').promises;

// Data file paths
const SERVICES_FILE = path.join(__dirname, '../data/services.json');
const BOOKINGS_FILE = path.join(__dirname, '../data/bookings.json');
const SETTINGS_FILE = path.join(__dirname, '../data/settings.json');
const TRANSLATIONS_FILE = path.join(__dirname, '../data/translations.json');
const HOLIDAYS_FILE = path.join(__dirname, '../data/holidays.json');
const USERS_FILE = path.join(__dirname, '../data/users.json');

// Helper function to read JSON file
async function readJsonFile(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // If file doesn't exist, create it with empty array/object
            const initialData = filePath.includes('settings') ? {} : [];
            await fs.writeFile(filePath, JSON.stringify(initialData, null, 2));
            return initialData;
        }
        throw error;
    }
}

// Helper function to write JSON file
async function writeJsonFile(filePath, data) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// Admin login route
router.post('/login', async (req, res) => {
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    const { username, password } = req.body;
    
    try {
        // For demo purposes, hardcoded credentials
        const validCredentials = {
            username: 'abdullah',
            password: 'Dordtselaan44a'
        };

        if (username === validCredentials.username && password === validCredentials.password) {
            const token = jwt.sign(
                { id: 1, username, role: 'admin' },
                process.env.JWT_SECRET || 'kapsalon-adem-secret-key-2024',
                { expiresIn: '24h' }
            );

            // Set cookie for web browsers
            res.cookie('adminToken', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'None',
                maxAge: 24 * 60 * 60 * 1000,
                path: '/',
                domain: process.env.NODE_ENV === 'production' ? '.onrender.com' : 'localhost'
            });

            // Also send token in response for API clients
            res.json({ 
                message: 'Logged in successfully',
                token,
                user: { username, role: 'admin' }
            });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error logging in' });
    }
});

// Check auth status
router.get('/check-auth', authMiddleware, (req, res) => {
    res.json({ 
        authenticated: true,
        user: { username: req.user.username, role: req.user.role }
    });
});

// Logout route
router.post('/logout', (req, res) => {
    res.clearCookie('adminToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
        path: '/',
        domain: process.env.NODE_ENV === 'production' ? '.netlify.app' : 'localhost'
    });
    res.json({ message: 'Logged out successfully' });
});

// Get dashboard data
router.get('/dashboard', authMiddleware, async (req, res) => {
    try {
        // Mock data for demo
        const data = {
            todayBookings: 5,
            pendingBookings: 3,
            completedBookings: 2,
            totalCustomers: 10,
            recentBookings: [
                {
                    id: 1,
                    date: new Date(),
                    time: '14:00',
                    customerName: 'John Doe',
                    service: 'Haircut',
                    status: 'Pending'
                },
                {
                    id: 2,
                    date: new Date(),
                    time: '15:00',
                    customerName: 'Jane Smith',
                    service: 'Haircut & Beard',
                    status: 'Confirmed'
                }
            ]
        };
        
        res.json(data);
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ message: 'Error fetching dashboard data' });
    }
});

// Dashboard Stats
router.get('/dashboard/stats', authMiddleware, async (req, res) => {
    try {
        const bookings = await readJsonFile(BOOKINGS_FILE);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayBookings = bookings.filter(booking => {
            const bookingDate = new Date(booking.date);
            return bookingDate >= today && bookingDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
        });

        const uniqueCustomers = new Set(bookings.map(b => b.email)).size;
        
        const todayRevenue = todayBookings
            .filter(b => b.status === 'confirmed')
            .reduce((sum, b) => sum + b.price, 0);

        res.json({
            todayBookings: todayBookings.length,
            totalCustomers: uniqueCustomers,
            todayRevenue,
            recentBookings: bookings
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 10)
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching dashboard stats' });
    }
});

// Services Management
router.get('/services', authMiddleware, async (req, res) => {
    try {
        const services = await readJsonFile(SERVICES_FILE);
        res.json(services);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching services' });
    }
});

router.post('/services', authMiddleware, async (req, res) => {
    try {
        const services = await readJsonFile(SERVICES_FILE);
        const newService = {
            id: Date.now().toString(),
            ...req.body
        };
        services.push(newService);
        await writeJsonFile(SERVICES_FILE, services);
        res.status(201).json(newService);
    } catch (error) {
        res.status(500).json({ message: 'Error creating service' });
    }
});

router.put('/services/:id', authMiddleware, async (req, res) => {
    try {
        const services = await readJsonFile(SERVICES_FILE);
        const index = services.findIndex(s => s.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ message: 'Service not found' });
        }
        services[index] = { ...services[index], ...req.body };
        await writeJsonFile(SERVICES_FILE, services);
        res.json(services[index]);
    } catch (error) {
        res.status(500).json({ message: 'Error updating service' });
    }
});

router.delete('/services/:id', authMiddleware, async (req, res) => {
    try {
        const services = await readJsonFile(SERVICES_FILE);
        const filteredServices = services.filter(s => s.id !== req.params.id);
        await writeJsonFile(SERVICES_FILE, filteredServices);
        res.json({ message: 'Service deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting service' });
    }
});

// Settings Management
router.get('/settings', authMiddleware, async (req, res) => {
    try {
        const settings = await readJsonFile(SETTINGS_FILE);
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching settings' });
    }
});

router.post('/settings', authMiddleware, async (req, res) => {
    try {
        await writeJsonFile(SETTINGS_FILE, req.body);
        res.json(req.body);
    } catch (error) {
        res.status(500).json({ message: 'Error updating settings' });
    }
});

// Change Password
router.post('/change-password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const users = await readJsonFile(USERS_FILE);
        
        const userIndex = users.findIndex(u => 
            u.username === req.user.username && 
            u.password === currentPassword
        );

        if (userIndex === -1) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        users[userIndex].password = newPassword;
        await writeJsonFile(USERS_FILE, users);
        
        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error changing password' });
    }
});

// Holidays Management
router.get('/holidays', authMiddleware, async (req, res) => {
    try {
        const holidays = await readJsonFile(HOLIDAYS_FILE);
        res.json(holidays);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching holidays' });
    }
});

router.post('/holidays', authMiddleware, async (req, res) => {
    try {
        const holidays = await readJsonFile(HOLIDAYS_FILE);
        const newHoliday = {
            id: Date.now().toString(),
            ...req.body
        };
        holidays.push(newHoliday);
        await writeJsonFile(HOLIDAYS_FILE, holidays);
        res.status(201).json(newHoliday);
    } catch (error) {
        res.status(500).json({ message: 'Error creating holiday' });
    }
});

router.delete('/holidays/:id', authMiddleware, async (req, res) => {
    try {
        const holidays = await readJsonFile(HOLIDAYS_FILE);
        const filteredHolidays = holidays.filter(h => h.id !== req.params.id);
        await writeJsonFile(HOLIDAYS_FILE, filteredHolidays);
        res.json({ message: 'Holiday deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting holiday' });
    }
});

// Recent Bookings
router.get('/dashboard/recent-bookings', authMiddleware, async (req, res) => {
    try {
        const bookings = await readJsonFile(BOOKINGS_FILE);
        res.json(bookings
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10)
        );
    } catch (error) {
        res.status(500).json({ message: 'Error fetching recent bookings' });
    }
});

// Bookings Management
router.get('/bookings', authMiddleware, async (req, res) => {
    try {
        const { date, status } = req.query;
        const bookings = await readJsonFile(BOOKINGS_FILE);
        const query = {};

        if (date) {
            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 1);
            query.date = { $gte: startDate, $lt: endDate };
        }

        if (status && status !== 'all') {
            query.status = status;
        }

        const filteredBookings = bookings.filter(booking => {
            let match = true;
            for (const key in query) {
                if (booking[key] !== query[key]) {
                    match = false;
                    break;
                }
            }
            return match;
        });

        res.json(filteredBookings
            .sort((a, b) => new Date(a.date) - new Date(b.date))
        );
    } catch (error) {
        res.status(500).json({ message: 'Error fetching bookings' });
    }
});

router.put('/bookings/:id/status', authMiddleware, async (req, res) => {
    try {
        const bookings = await readJsonFile(BOOKINGS_FILE);
        const index = bookings.findIndex(b => b.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        bookings[index].status = req.body.status;
        await writeJsonFile(BOOKINGS_FILE, bookings);
        res.json(bookings[index]);
    } catch (error) {
        res.status(500).json({ message: 'Error updating booking status' });
    }
});

// Translation Management
router.get('/translations', authMiddleware, async (req, res) => {
    try {
        const translations = await readJsonFile(TRANSLATIONS_FILE);
        res.json(translations);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching translations' });
    }
});

router.post('/translations', authMiddleware, async (req, res) => {
    try {
        await writeJsonFile(TRANSLATIONS_FILE, req.body);
        res.status(201).json(req.body);
    } catch (error) {
        res.status(500).json({ message: 'Error saving translations' });
    }
});

module.exports = router;
