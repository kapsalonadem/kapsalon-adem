require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const sgMail = require('@sendgrid/mail');
const moment = require('moment');
const helmet = require('helmet');
const schedule = require('node-schedule');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs').promises;
const cookieParser = require('cookie-parser');

// Define MongoDB schemas
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

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
const corsOptions = {
    origin: ['https://ademkapsalon.netlify.app', 'http://localhost:3000', 'http://localhost:8080'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie'],
    preflightContinue: true,
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "unsafe-none" },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            connectSrc: ["'self'", "https://ademkapsalon.netlify.app", "https://kapsalon-adem.onrender.com"],
            imgSrc: ["'self'", "data:", "https:"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https:"],
            fontSrc: ["'self'", "https:", "data:"],
            formAction: ["'self'"],
            upgradeInsecureRequests: null
        }
    }
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.static('public'));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        environment: process.env.NODE_ENV,
        timestamp: new Date()
    });
});

// MongoDB connection with retry logic
const connectDB = async () => {
    const maxRetries = 5;
    let retries = 0;
    
    while (retries < maxRetries) {
        try {
            console.log('Attempting to connect to MongoDB...');
            await mongoose.connect(process.env.MONGODB_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000
            });
            console.log('MongoDB connected successfully');
            return;
        } catch (error) {
            retries++;
            console.error(`MongoDB connection attempt ${retries} failed:`, error.message);
            if (retries === maxRetries) {
                console.error('Max retries reached. Could not connect to MongoDB');
                process.exit(1);
            }
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, retries), 10000)));
        }
    }
};

connectDB();

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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

// Get available time slots for a date
app.get('/api/appointments/availability', async (req, res) => {
    try {
        console.log('MongoDB URI:', process.env.MONGODB_URI);
        console.log('Connected to MongoDB:', mongoose.connection.readyState);

        if (!req.query.date) {
            return res.status(400).json({ error: 'Date parameter is required' });
        }

        const requestedDate = new Date(req.query.date);
        if (isNaN(requestedDate.getTime())) {
            return res.status(400).json({ error: 'Invalid date format' });
        }

        const startOfDay = new Date(requestedDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(requestedDate);
        endOfDay.setHours(23, 59, 59, 999);

        console.log('Checking availability for:', {
            requestedDate: requestedDate.toISOString(),
            startOfDay: startOfDay.toISOString(),
            endOfDay: endOfDay.toISOString()
        });

        // Get all appointments for the date
        const appointments = await Appointment.find({
            date: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        }).lean().exec();

        console.log('Found appointments:', JSON.stringify(appointments, null, 2));

        // Define business hours
        const businessHours = {
            start: 9, // 9 AM
            end: 18   // 6 PM
        };

        // Generate all possible time slots
        const timeSlots = [];
        for (let hour = businessHours.start; hour < businessHours.end; hour++) {
            timeSlots.push(`${String(hour).padStart(2, '0')}:00`);
            timeSlots.push(`${String(hour).padStart(2, '0')}:30`);
        }

        // Filter out booked slots
        const bookedTimes = appointments.map(apt => apt.time);
        const availableSlots = timeSlots.filter(time => !bookedTimes.includes(time));

        console.log('Available slots:', availableSlots);

        res.json({ 
            date: requestedDate.toISOString().split('T')[0],
            availableSlots,
            businessHours,
            totalSlots: timeSlots.length,
            bookedSlots: bookedTimes
        });
    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({ 
            error: 'Error fetching appointments',
            details: error.message,
            stack: error.stack
        });
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

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Email template function
function generateBookingEmail(booking) {
    return {
        subject: 'Booking Confirmation - Kapsalon Adem',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Thank you for your booking!</h2>
                <p>Dear ${booking.name},</p>
                <p>Your appointment has been confirmed:</p>
                <div style="background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Service:</strong> ${booking.service}</p>
                    <p><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString()}</p>
                    <p><strong>Time:</strong> ${booking.time}</p>
                    <p><strong>Barber:</strong> ${booking.barber}</p>
                </div>
                <p><strong>Location:</strong> [Barbershop Address]</p>
                <p>If you need to cancel or reschedule, please contact us at least 24 hours in advance.</p>
                <p>Phone: [Phone Number]</p>
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                    <p style="color: #666; font-size: 12px;">
                        This is an automated message, please do not reply to this email.
                    </p>
                </div>
            </div>
        `
    };
}

// Update the booking route to include email confirmation
app.post('/api/bookings', async (req, res) => {
    try {
        const booking = new Appointment(req.body);
        await booking.save();

        // Send confirmation email
        const emailContent = generateBookingEmail(booking);
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: booking.email,
            subject: emailContent.subject,
            html: emailContent.html
        });

        res.status(201).json({ 
            message: 'Booking confirmed! Check your email for details.',
            booking 
        });
    } catch (error) {
        console.error('Booking error:', error);
        res.status(500).json({ 
            message: 'Error creating booking',
            error: error.message 
        });
    }
});

// Admin routes
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

// Serve admin dashboard
app.get('/admin', authenticateAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'dashboard.html'));
});

// Serve admin login page
app.get('/admin/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'login.html'));
});

// Function to read admin credentials
async function getAdminCredentials() {
    try {
        const data = await fs.readFile(path.join(__dirname, 'data', 'admin-credentials.json'), 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading admin credentials:', error);
        return null;
    }
}

// Function to save admin credentials
async function saveAdminCredentials(credentials) {
    try {
        await fs.writeFile(
            path.join(__dirname, 'data', 'admin-credentials.json'),
            JSON.stringify(credentials, null, 4),
            'utf8'
        );
        return true;
    } catch (error) {
        console.error('Error saving admin credentials:', error);
        return false;
    }
}

// Admin login route
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const credentials = await getAdminCredentials();
        if (!credentials) {
            return res.status(500).json({ message: 'Error reading credentials' });
        }

        if (username === credentials.username && password === credentials.password) {
            const token = jwt.sign(
                { id: 1, username, role: 'admin' },
                process.env.JWT_SECRET || 'kapsalon-adem-secret-key-2024',
                { expiresIn: '24h' }
            );

            // Set cookie for web browsers
            res.cookie('adminToken', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Lax',
                maxAge: 24 * 60 * 60 * 1000, // 24 hours
                path: '/',
                domain: process.env.NODE_ENV === 'production' ? '.netlify.app' : 'localhost'
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

// Add auth check endpoint
app.get('/api/admin/check-auth', async (req, res) => {
    const token = req.cookies.adminToken || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'kapsalon-adem-secret-key-2024');
        res.json({ 
            authenticated: true,
            user: { username: decoded.username, role: decoded.role }
        });
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
});

// Change password route
app.post('/api/admin/change-password', authenticateAdmin, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    try {
        const credentials = await getAdminCredentials();
        if (!credentials) {
            return res.status(500).json({ message: 'Error reading credentials' });
        }

        if (currentPassword !== credentials.password) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'New password must be at least 8 characters long' });
        }

        credentials.password = newPassword;
        const saved = await saveAdminCredentials(credentials);

        if (saved) {
            res.json({ message: 'Password changed successfully' });
        } else {
            res.status(500).json({ message: 'Error saving new password' });
        }
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ message: 'Error changing password' });
    }
});

// Admin authentication middleware
function authenticateAdmin(req, res, next) {
    const token = req.cookies.adminToken;
    if (!token) {
        return res.redirect('/admin/login');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'kapsalon-adem-secret-key-2024');
        if (decoded.role !== 'admin') {
            return res.redirect('/admin/login');
        }
        req.admin = decoded;
        next();
    } catch (error) {
        res.redirect('/admin/login');
    }
}

// Admin logout route
app.post('/api/admin/logout', (req, res) => {
    res.clearCookie('adminToken');
    res.json({ message: 'Logged out successfully' });
});

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
