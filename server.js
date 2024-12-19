require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const sgMail = require('@sendgrid/mail');
const moment = require('moment');
const helmet = require('helmet');
const schedule = require('node-schedule');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors()); // Allow all origins for now

// Standard middleware
app.use(express.json());
app.use(express.static('public'));

// Health check endpoint
app.get('/health', (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1;
    res.json({
        status: 'ok',
        database: dbStatus ? 'connected' : 'disconnected',
        timestamp: new Date()
    });
});

// MongoDB connection with retry logic
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/kapsalon-adem', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('MongoDB connected successfully');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        setTimeout(connectDB, 5000); // Retry after 5 seconds
    }
};

connectDB();

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Appointment Schema
const appointmentSchema = new mongoose.Schema({
    service: String,
    date: Date,
    time: String,
    name: String,
    email: String,
    phone: String,
    barber: String,
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Appointment = mongoose.model('Appointment', appointmentSchema);

// Backup Schema
const backupSchema = new mongoose.Schema({
    date: Date,
    appointments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' }],
    services: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
    settings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Settings' }]
});

const Backup = mongoose.model('Backup', backupSchema);

// Service Schema
const serviceSchema = new mongoose.Schema({
    name: String
});

const Service = mongoose.model('Service', serviceSchema);

// Settings Schema
const settingsSchema = new mongoose.Schema({
    name: String
});

const Settings = mongoose.model('Settings', settingsSchema);

// Failed Booking Schema
const failedBookingSchema = new mongoose.Schema({
    bookingData: Object,
    error: String,
    timestamp: Date,
    resolved: { type: Boolean, default: false }
});

const FailedBooking = mongoose.model('FailedBooking', failedBookingSchema);

// Booking queue system
const bookingQueue = {
    queue: new Map(),
    processing: new Map(),
    retryAttempts: 3,
    retryDelay: 1000, // 1 second

    async add(bookingData) {
        const bookingId = Date.now().toString();
        this.queue.set(bookingId, {
            data: bookingData,
            attempts: 0,
            timestamp: Date.now()
        });
        return this.process(bookingId);
    },

    async process(bookingId) {
        const booking = this.queue.get(bookingId);
        if (!booking) return null;

        // Move to processing queue
        this.processing.set(bookingId, booking);
        this.queue.delete(bookingId);

        try {
            // Double-check availability
            const isAvailable = await this.checkAvailability(booking.data);
            if (!isAvailable) {
                throw new Error('Time slot no longer available');
            }

            // Create appointment with retry logic
            const appointment = await this.createAppointmentWithRetry(booking.data);

            // Send confirmations with retry
            await this.sendConfirmationsWithRetry(appointment);

            // Success - remove from processing
            this.processing.delete(bookingId);
            return appointment;

        } catch (error) {
            console.error(`Booking processing error (Attempt ${booking.attempts + 1}):`, error);

            if (booking.attempts < this.retryAttempts) {
                // Return to queue for retry
                booking.attempts++;
                this.queue.set(bookingId, booking);
                this.processing.delete(bookingId);

                // Retry after delay
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                return this.process(bookingId);
            } else {
                // All retries failed - notify admin and customer
                await this.handleBookingFailure(booking.data, error);
                this.processing.delete(bookingId);
                throw error;
            }
        }
    },

    async checkAvailability(bookingData) {
        try {
            const { date, time, barber } = bookingData;
            const existingBooking = await Appointment.findOne({ date, time, barber });
            return !existingBooking;
        } catch (error) {
            console.error('Availability check error:', error);
            return false;
        }
    },

    async createAppointmentWithRetry(bookingData) {
        for (let i = 0; i < this.retryAttempts; i++) {
            try {
                const appointment = new Appointment(bookingData);
                await appointment.save();
                return appointment;
            } catch (error) {
                if (i === this.retryAttempts - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
            }
        }
    },

    async sendConfirmationsWithRetry(appointment) {
        const customerMsg = {
            to: appointment.email,
            subject: 'Appointment Confirmation',
            text: `Your appointment is confirmed for ${appointment.date} at ${appointment.time}`
        };

        const salonMsg = {
            to: process.env.ADMIN_EMAIL,
            subject: 'New Booking',
            text: `New appointment: ${appointment.date} at ${appointment.time} for ${appointment.name}`
        };

        // Try multiple email services with retry
        await this.sendEmailWithRetry(customerMsg);
        await this.sendEmailWithRetry(salonMsg);
    },

    async sendEmailWithRetry(emailData) {
        for (let i = 0; i < this.retryAttempts; i++) {
            try {
                await sendEmail(emailData);
                return;
            } catch (error) {
                if (i === this.retryAttempts - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
            }
        }
    },

    async handleBookingFailure(bookingData, error) {
        // Store failed booking in separate collection
        try {
            await FailedBooking.create({
                bookingData,
                error: error.message,
                timestamp: new Date()
            });

            // Notify admin
            await sendEmail({
                to: process.env.ADMIN_EMAIL,
                subject: 'URGENT: Booking System Failure',
                text: `Booking failed for ${bookingData.name} on ${bookingData.date} at ${bookingData.time}.\nError: ${error.message}`
            });

            // Notify customer
            await sendEmail({
                to: bookingData.email,
                subject: 'Booking Status: Action Required',
                text: `We apologize, but there was an issue processing your booking. Please call us directly at ${process.env.SALON_PHONE} to confirm your appointment.`
            });
        } catch (notificationError) {
            console.error('Failed to handle booking failure:', notificationError);
        }
    }
};

// Modified booking endpoint to use queue
app.post('/api/appointments', async (req, res) => {
    try {
        const appointment = await bookingQueue.add(req.body);
        res.status(201).json({ 
            success: true,
            message: 'Appointment created successfully', 
            appointment 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Unable to process booking. Our team has been notified and will contact you shortly.',
            error: error.message
        });
    }
});

// Get appointments for a specific date
app.get('/api/appointments/:date', async (req, res) => {
    try {
        const date = new Date(req.params.date);
        const appointments = await Appointment.find({
            date: {
                $gte: new Date(date.setHours(0,0,0)),
                $lt: new Date(date.setHours(23,59,59))
            },
            status: { $ne: 'cancelled' }
        });
        res.json(appointments);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching appointments' });
    }
});

// Backup system
const backup = {
    // Daily backup at midnight
    scheduleBackup: () => {
        const backupTime = '00:00';
        schedule.scheduleJob(backupTime, async () => {
            try {
                // Backup appointments
                const appointments = await Appointment.find({});
                const backupData = {
                    date: new Date(),
                    appointments,
                    services: await Service.find({}),
                    settings: await Settings.find({})
                };

                // Save backup to separate collection
                await Backup.create(backupData);

                // Keep only last 30 days of backups
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                await Backup.deleteMany({ date: { $lt: thirtyDaysAgo } });

                // Send backup success email
                await sendEmail({
                    to: process.env.ADMIN_EMAIL,
                    subject: 'Daily Backup Successful',
                    text: `Backup completed successfully on ${new Date().toLocaleDateString()}`
                });
            } catch (error) {
                console.error('Backup failed:', error);
                // Send backup failure notification
                await sendEmail({
                    to: process.env.ADMIN_EMAIL,
                    subject: 'Backup Failed - Action Required',
                    text: `Backup failed on ${new Date().toLocaleDateString()}. Error: ${error.message}`
                });
            }
        });
    }
};

backup.scheduleBackup();

// Periodic cleanup of old processing queue items
setInterval(() => {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    for (const [id, booking] of bookingQueue.processing) {
        if (booking.timestamp < oneHourAgo) {
            bookingQueue.processing.delete(id);
        }
    }
}, 15 * 60 * 1000); // Run every 15 minutes

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    
    // Send error notification for critical errors
    if (err.critical) {
        sendEmail({
            to: process.env.ADMIN_EMAIL,
            subject: 'Critical Error in Booking System',
            text: `Error: ${err.message}\nStack: ${err.stack}`
        });
    }
    
    res.status(500).json({
        success: false,
        message: 'Something went wrong! We have been notified and will fix it soon.'
    });
});

// Fallback email service
const sendEmail = async (options) => {
    try {
        // Try SendGrid first
        await sgMail.send(options);
    } catch (error) {
        console.error('SendGrid failed, trying Nodemailer:', error);
        try {
            // Fallback to Nodemailer
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.GMAIL_USER,
                    pass: process.env.GMAIL_PASS
                }
            });
            await transporter.sendMail(options);
        } catch (nodemailerError) {
            console.error('Both email services failed:', nodemailerError);
            throw new Error('Email service unavailable');
        }
    }
};

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
