require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

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

// Connect to MongoDB
async function initDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB');

        // Create test appointment
        const testAppointment = new Appointment({
            service: 'Haircut',
            date: new Date('2024-12-28'),
            time: '14:00',
            name: 'Test Customer',
            email: 'test@example.com',
            phone: '+31612345678',
            barber: 'Adem',
            status: 'confirmed'
        });

        await testAppointment.save();
        console.log('Test appointment created successfully');

        // List all appointments
        const appointments = await Appointment.find();
        console.log('Current appointments:', appointments);

        await mongoose.connection.close();
        console.log('Database connection closed');
    } catch (error) {
        console.error('Error:', error);
    }
}

initDB();
