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

// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// Navbar background change on scroll
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.background = 'rgba(0, 0, 0, 0.95)';
    } else {
        navbar.style.background = 'rgba(0, 0, 0, 0.8)';
    }
});

// Language switcher
function changeLanguage(lang) {
    const buttons = document.querySelectorAll('.lang-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Add translation logic here
}

// Mobile menu toggle
const mobileMenuBtn = document.createElement('button');
mobileMenuBtn.className = 'mobile-menu-btn';
mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
document.querySelector('.nav-brand').appendChild(mobileMenuBtn);

mobileMenuBtn.addEventListener('click', () => {
    const navLinks = document.querySelector('.nav-links');
    navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
});

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate');
        }
    });
}, observerOptions);

document.querySelectorAll('.service-card, .section-header').forEach(el => {
    observer.observe(el);
});

// Booking form handling
const bookingForm = document.getElementById('booking-form');
if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(bookingForm);
        const data = Object.fromEntries(formData);

        try {
            const response = await fetch('/api/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                const result = await response.json();
                showMessage('Booking confirmed! Check your email for details.', 'success');
                bookingForm.reset();
            } else {
                throw new Error('Booking failed');
            }
        } catch (error) {
            showMessage('Error creating booking. Please try again.', 'error');
        }
    });
}

// Show message function
function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    const container = document.querySelector('.booking-container');
    container.insertBefore(messageDiv, bookingForm);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Initialize map
function initMap() {
    const shopLocation = { lat: 51.8905746, lng: 4.4918883 };
    const map = new google.maps.Map(document.getElementById('map'), {
        zoom: 15,
        center: shopLocation,
    });
    
    const marker = new google.maps.Marker({
        position: shopLocation,
        map: map,
        title: 'Kapsalon Adem'
    });
}

// Load Google Maps API
function loadGoogleMaps() {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&callback=initMap`;
    script.defer = true;
    document.head.appendChild(script);
}
