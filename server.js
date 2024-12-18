require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const sgMail = require('@sendgrid/mail');
const moment = require('moment');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://ademkapsalon.netlify.app']
        : ['http://localhost:3000', 'http://localhost:5000']
}));

// Standard middleware
app.use(express.json());
app.use(express.static('public'));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: process.env.NODE_ENV === 'production' 
            ? 'Internal Server Error' 
            : err.message 
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK' });
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

// Check availability
app.post('/api/check-availability', async (req, res) => {
    const { date, time, barber } = req.body;
    
    try {
        const existingAppointment = await Appointment.findOne({
            date: new Date(date),
            time: time,
            barber: barber,
            status: { $ne: 'cancelled' }
        });

        res.json({ available: !existingAppointment });
    } catch (error) {
        res.status(500).json({ error: 'Error checking availability' });
    }
});

// Create appointment
app.post('/api/appointments', async (req, res) => {
    try {
        const appointment = new Appointment(req.body);
        await appointment.save();

        // Email templates based on language
        const emailTemplates = {
            nl: {
                customer: {
                    subject: 'Afspraakbevestiging - Kapsalon Adem',
                    title: 'Bedankt voor uw afspraak bij Kapsalon Adem',
                    details: 'Afspraakdetails:',
                    date: 'Datum',
                    time: 'Tijd',
                    service: 'Service',
                    barber: 'Kapper',
                    address: 'Adres',
                    changeText: 'Als u uw afspraak wilt wijzigen of annuleren, bel ons dan op een van de volgende nummers:'
                },
                salon: {
                    subject: 'Nieuwe Afspraak - Kapsalon Adem',
                    title: 'Nieuwe afspraak gemaakt',
                    details: 'Afspraakdetails:',
                    name: 'Naam',
                    email: 'Email',
                    phone: 'Telefoon',
                    date: 'Datum',
                    time: 'Tijd',
                    service: 'Service',
                    barber: 'Kapper'
                }
            },
            en: {
                customer: {
                    subject: 'Appointment Confirmation - Kapsalon Adem',
                    title: 'Thank you for your appointment at Kapsalon Adem',
                    details: 'Appointment details:',
                    date: 'Date',
                    time: 'Time',
                    service: 'Service',
                    barber: 'Barber',
                    address: 'Address',
                    changeText: 'If you need to change or cancel your appointment, please call us at one of the following numbers:'
                },
                salon: {
                    subject: 'New Appointment - Kapsalon Adem',
                    title: 'New appointment made',
                    details: 'Appointment details:',
                    name: 'Name',
                    email: 'Email',
                    phone: 'Phone',
                    date: 'Date',
                    time: 'Time',
                    service: 'Service',
                    barber: 'Barber'
                }
            }
        };

        const lang = req.body.language || 'nl';
        const template = emailTemplates[lang];

        // Send confirmation email to customer
        const customerMsg = {
            to: appointment.email,
            from: process.env.FROM_EMAIL,
            subject: template.customer.subject,
            html: `
                <h2>${template.customer.title}</h2>
                <p>${template.customer.details}</p>
                <ul>
                    <li>${template.customer.date}: ${moment(appointment.date).format('DD-MM-YYYY')}</li>
                    <li>${template.customer.time}: ${appointment.time}</li>
                    <li>${template.customer.service}: ${appointment.service}</li>
                    <li>${template.customer.barber}: ${appointment.barber}</li>
                </ul>
                <p>${template.customer.address}: Dortselaan 44/A-3073-6D, Rotterdam</p>
                <p>${template.customer.changeText}</p>
                <ul>
                    <li>Hasan: +31687347940</li>
                    <li>Adem: +31684262200</li>
                    <li>Abdullah: +31614627757</li>
                </ul>
            `
        };

        // Send notification email to salon
        const salonMsg = {
            to: process.env.SALON_EMAIL,
            from: process.env.FROM_EMAIL,
            subject: template.salon.subject,
            html: `
                <h2>${template.salon.title}</h2>
                <p>${template.salon.details}</p>
                <ul>
                    <li>${template.salon.name}: ${appointment.name}</li>
                    <li>${template.salon.email}: ${appointment.email}</li>
                    <li>${template.salon.phone}: ${appointment.phone}</li>
                    <li>${template.salon.date}: ${moment(appointment.date).format('DD-MM-YYYY')}</li>
                    <li>${template.salon.time}: ${appointment.time}</li>
                    <li>${template.salon.service}: ${appointment.service}</li>
                    <li>${template.salon.barber}: ${appointment.barber}</li>
                </ul>
            `
        };

        // Send both emails
        await Promise.all([
            sgMail.send(customerMsg),
            sgMail.send(salonMsg)
        ]);

        res.status(201).json({ message: 'Appointment created successfully', appointment });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error creating appointment' });
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

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
