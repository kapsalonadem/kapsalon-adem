require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const moment = require('moment');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/kapsalon-adem');

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

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

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

        // Send confirmation email to customer
        const customerMailOptions = {
            from: process.env.EMAIL_USER,
            to: appointment.email,
            subject: 'Afspraakbevestiging - Kapsalon Adem',
            html: `
                <h2>Bedankt voor uw afspraak bij Kapsalon Adem</h2>
                <p>Afspraakdetails:</p>
                <ul>
                    <li>Datum: ${moment(appointment.date).format('DD-MM-YYYY')}</li>
                    <li>Tijd: ${appointment.time}</li>
                    <li>Service: ${appointment.service}</li>
                    <li>Kapper: ${appointment.barber}</li>
                </ul>
                <p>Adres: Dortselaan 44/A-3073-6D, Rotterdam</p>
                <p>Als u uw afspraak wilt wijzigen of annuleren, bel ons dan op een van de volgende nummers:</p>
                <ul>
                    <li>Hasan: +31687347940</li>
                    <li>Adem: +31684262200</li>
                    <li>Abdullah: +31614627757</li>
                </ul>
            `
        };

        // Send notification email to salon
        const salonMailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.SALON_EMAIL,
            subject: 'Nieuwe Afspraak',
            html: `
                <h2>Nieuwe afspraak gemaakt</h2>
                <p>Klantgegevens:</p>
                <ul>
                    <li>Naam: ${appointment.name}</li>
                    <li>Email: ${appointment.email}</li>
                    <li>Telefoon: ${appointment.phone}</li>
                </ul>
                <p>Afspraakdetails:</p>
                <ul>
                    <li>Datum: ${moment(appointment.date).format('DD-MM-YYYY')}</li>
                    <li>Tijd: ${appointment.time}</li>
                    <li>Service: ${appointment.service}</li>
                    <li>Kapper: ${appointment.barber}</li>
                </ul>
            `
        };

        await transporter.sendMail(customerMailOptions);
        await transporter.sendMail(salonMailOptions);

        res.status(201).json(appointment);
    } catch (error) {
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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
