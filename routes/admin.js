const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const path = require('path');
const fs = require('fs').promises;
const jwt = require('jsonwebtoken');

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

// Login route (unprotected)
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const users = await readJsonFile(USERS_FILE);
        
        const user = users.find(u => u.username === username && u.password === password);
        
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Create token
        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        // Set token in cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

        res.json({ message: 'Logged in successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error logging in' });
    }
});

// Protected routes
router.use(auth);

// Dashboard Stats
router.get('/dashboard/stats', async (req, res) => {
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
router.get('/services', async (req, res) => {
    try {
        const services = await readJsonFile(SERVICES_FILE);
        res.json(services);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching services' });
    }
});

router.post('/services', async (req, res) => {
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

router.put('/services/:id', async (req, res) => {
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

router.delete('/services/:id', async (req, res) => {
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
router.get('/settings', async (req, res) => {
    try {
        const settings = await readJsonFile(SETTINGS_FILE);
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching settings' });
    }
});

router.post('/settings', async (req, res) => {
    try {
        await writeJsonFile(SETTINGS_FILE, req.body);
        res.json(req.body);
    } catch (error) {
        res.status(500).json({ message: 'Error updating settings' });
    }
});

// Change Password
router.post('/change-password', async (req, res) => {
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
router.get('/holidays', async (req, res) => {
    try {
        const holidays = await readJsonFile(HOLIDAYS_FILE);
        res.json(holidays);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching holidays' });
    }
});

router.post('/holidays', async (req, res) => {
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

router.delete('/holidays/:id', async (req, res) => {
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
router.get('/dashboard/recent-bookings', async (req, res) => {
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
router.get('/bookings', async (req, res) => {
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

router.put('/bookings/:id/status', async (req, res) => {
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
router.get('/translations', async (req, res) => {
    try {
        const translations = await readJsonFile(TRANSLATIONS_FILE);
        res.json(translations);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching translations' });
    }
});

router.post('/translations', async (req, res) => {
    try {
        await writeJsonFile(TRANSLATIONS_FILE, req.body);
        res.status(201).json(req.body);
    } catch (error) {
        res.status(500).json({ message: 'Error saving translations' });
    }
});

module.exports = router;
