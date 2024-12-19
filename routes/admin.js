const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/auth');
const Service = require('../models/Service');
const Booking = require('../models/Booking');
const Settings = require('../models/Settings');
const Translation = require('../models/Translation');
const Holiday = require('../models/Holiday');

// Protect all admin routes
router.use(authenticateAdmin);

// Dashboard Stats
router.get('/dashboard/stats', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayBookings = await Booking.countDocuments({
            date: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
        });

        const totalCustomers = await Booking.distinct('customerEmail').length;

        const todayRevenue = await Booking.aggregate([
            {
                $match: {
                    date: {
                        $gte: today,
                        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
                    },
                    status: 'confirmed'
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$price' }
                }
            }
        ]);

        res.json({
            todayBookings,
            totalCustomers,
            todayRevenue: todayRevenue[0]?.total || 0
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching dashboard stats' });
    }
});

// Recent Bookings
router.get('/dashboard/recent-bookings', async (req, res) => {
    try {
        const bookings = await Booking.find()
            .sort({ date: -1 })
            .limit(10)
            .populate('service');
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching recent bookings' });
    }
});

// Services Management
router.get('/services', async (req, res) => {
    try {
        const services = await Service.find();
        res.json(services);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching services' });
    }
});

router.post('/services', async (req, res) => {
    try {
        const service = new Service(req.body);
        await service.save();
        res.status(201).json(service);
    } catch (error) {
        res.status(500).json({ message: 'Error creating service' });
    }
});

router.put('/services/:id', async (req, res) => {
    try {
        const service = await Service.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json(service);
    } catch (error) {
        res.status(500).json({ message: 'Error updating service' });
    }
});

router.delete('/services/:id', async (req, res) => {
    try {
        await Service.findByIdAndDelete(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Error deleting service' });
    }
});

// Bookings Management
router.get('/bookings', async (req, res) => {
    try {
        const { date, status } = req.query;
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

        const bookings = await Booking.find(query)
            .sort({ date: 1, time: 1 })
            .populate('service');
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching bookings' });
    }
});

router.put('/bookings/:id/status', async (req, res) => {
    try {
        const booking = await Booking.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true }
        );
        res.json(booking);
    } catch (error) {
        res.status(500).json({ message: 'Error updating booking status' });
    }
});

// Schedule Management
router.get('/schedule', async (req, res) => {
    try {
        const settings = await Settings.findOne();
        res.json(settings.schedule || {});
    } catch (error) {
        res.status(500).json({ message: 'Error fetching schedule' });
    }
});

router.post('/schedule', async (req, res) => {
    try {
        const settings = await Settings.findOne();
        settings.schedule = req.body;
        await settings.save();
        res.json(settings.schedule);
    } catch (error) {
        res.status(500).json({ message: 'Error saving schedule' });
    }
});

// Holiday Management
router.get('/holidays', async (req, res) => {
    try {
        const holidays = await Holiday.find().sort({ date: 1 });
        res.json(holidays);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching holidays' });
    }
});

router.post('/holidays', async (req, res) => {
    try {
        const holiday = new Holiday(req.body);
        await holiday.save();
        res.status(201).json(holiday);
    } catch (error) {
        res.status(500).json({ message: 'Error creating holiday' });
    }
});

router.delete('/holidays/:id', async (req, res) => {
    try {
        await Holiday.findByIdAndDelete(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Error deleting holiday' });
    }
});

// Translation Management
router.get('/translations', async (req, res) => {
    try {
        const translations = await Translation.find();
        res.json(translations);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching translations' });
    }
});

router.post('/translations', async (req, res) => {
    try {
        await Translation.deleteMany({}); // Clear existing translations
        const translations = await Translation.insertMany(req.body);
        res.status(201).json(translations);
    } catch (error) {
        res.status(500).json({ message: 'Error saving translations' });
    }
});

// Settings Management
router.get('/settings', async (req, res) => {
    try {
        const settings = await Settings.findOne();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching settings' });
    }
});

router.post('/settings', async (req, res) => {
    try {
        const settings = await Settings.findOne();
        Object.assign(settings, req.body);
        await settings.save();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: 'Error saving settings' });
    }
});

module.exports = router;
