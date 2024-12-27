// Global state
let availableTimeSlots = [];

// Smooth scroll to booking section
function scrollToBooking() {
    document.getElementById('booking').scrollIntoView({ behavior: 'smooth' });
}

// Format date for API
function formatDate(date) {
    return moment(date).format('YYYY-MM-DD');
}

// Format time for display
function formatTime(time) {
    return moment(time, 'HH:mm').format('HH:mm');
}

// Check availability for selected date
async function checkAvailability(date) {
    try {
        const response = await fetch(`/api/appointments/availability?date=${date}`);
        if (!response.ok) throw new Error('Failed to fetch availability');
        const data = await response.json();
        return data.availableSlots;
    } catch (error) {
        console.error('Error checking availability:', error);
        return [];
    }
}

// Generate time slots
async function generateTimeSlots() {
    const timeSlots = document.getElementById('timeSlots');
    const selectedDate = document.getElementById('date').value;
    
    if (!selectedDate) return;
    
    // Show loading state
    timeSlots.innerHTML = '<div class="loading">Loading available times...</div>';
    
    try {
        // Get available slots from backend
        availableTimeSlots = await checkAvailability(selectedDate);
        
        timeSlots.innerHTML = '';
        
        if (availableTimeSlots.length === 0) {
            timeSlots.innerHTML = '<div class="no-slots">No available times for this date</div>';
            return;
        }
        
        availableTimeSlots.forEach(slot => {
            const timeSlot = document.createElement('div');
            timeSlot.className = 'time-slot';
            timeSlot.textContent = formatTime(slot);
            timeSlot.onclick = () => selectTimeSlot(timeSlot);
            timeSlots.appendChild(timeSlot);
        });
    } catch (error) {
        timeSlots.innerHTML = '<div class="error">Error loading time slots. Please try again.</div>';
        console.error('Error generating time slots:', error);
    }
}

// Handle time slot selection
function selectTimeSlot(slot) {
    document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
    slot.classList.add('selected');
}

// Initialize date picker
function initializeDatePicker() {
    const dateInput = document.getElementById('date');
    const today = new Date();
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 2); // Allow booking up to 2 months in advance
    
    dateInput.min = today.toISOString().split('T')[0];
    dateInput.max = maxDate.toISOString().split('T')[0];
    
    dateInput.addEventListener('change', generateTimeSlots);
}

// Show loading state
function showLoading() {
    const submitBtn = document.querySelector('#bookingForm button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
}

// Reset loading state
function resetLoading() {
    const submitBtn = document.querySelector('#bookingForm button[type="submit"]');
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Confirm Booking';
}

// Handle form submission
document.getElementById('bookingForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const selectedTimeSlot = document.querySelector('.time-slot.selected');
    if (!selectedTimeSlot) {
        alert('Please select a time slot');
        return;
    }
    
    showLoading();
    
    const bookingData = {
        service: document.getElementById('service').value,
        date: document.getElementById('date').value,
        time: selectedTimeSlot.textContent,
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value
    };
    
    try {
        const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookingData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Show success message
            const successMessage = document.createElement('div');
            successMessage.className = 'success-message';
            successMessage.innerHTML = `
                <i class="fas fa-check-circle"></i>
                <h3>Booking Confirmed!</h3>
                <p>We've sent a confirmation email to ${bookingData.email}</p>
                <p>Appointment Details:</p>
                <ul>
                    <li>Service: ${bookingData.service}</li>
                    <li>Date: ${moment(bookingData.date).format('DD MMMM YYYY')}</li>
                    <li>Time: ${bookingData.time}</li>
                </ul>
            `;
            
            const bookingContainer = document.querySelector('.booking-container');
            bookingContainer.innerHTML = '';
            bookingContainer.appendChild(successMessage);
            
            // Scroll to success message
            successMessage.scrollIntoView({ behavior: 'smooth' });
        } else {
            throw new Error(result.message || 'Booking failed');
        }
    } catch (error) {
        console.error('Booking error:', error);
        alert(error.message || 'Unable to process booking. Please try again later.');
    } finally {
        resetLoading();
    }
});

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    initializeDatePicker();
    generateTimeSlots();
    
    // Initialize animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
            }
        });
    }, { threshold: 0.1 });
    
    document.querySelectorAll('.service-card').forEach(card => {
        observer.observe(card);
    });
});
