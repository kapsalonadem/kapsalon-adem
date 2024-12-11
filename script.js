document.addEventListener('DOMContentLoaded', function() {
    // Initialize the booking system
    initializeBookingSystem();
    
    // Handle mobile menu
    initializeMobileMenu();
    
    // Handle smooth scrolling
    initializeSmoothScroll();
});

function initializeBookingSystem() {
    const timeSelect = document.getElementById('time');
    const dateInput = document.getElementById('date');
    const form = document.getElementById('appointmentForm');

    // Set minimum date to today
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.min = tomorrow.toISOString().split('T')[0];

    // Generate time slots
    dateInput.addEventListener('change', function() {
        generateTimeSlots();
    });

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        handleBookingSubmission();
    });
}

function generateTimeSlots() {
    const timeSelect = document.getElementById('time');
    timeSelect.innerHTML = '<option value="">Selecteer een tijd</option>';
    
    // Generate time slots from 09:00 to 17:30 with 30-minute intervals
    const startTime = 9 * 60; // 09:00 in minutes
    const endTime = 17 * 60 + 30; // 17:30 in minutes
    const interval = 30; // 30 minutes

    for (let time = startTime; time <= endTime - interval; time += interval) {
        const hours = Math.floor(time / 60);
        const minutes = time % 60;
        const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        
        const option = document.createElement('option');
        option.value = timeString;
        option.textContent = timeString;
        timeSelect.appendChild(option);
    }
}

function handleBookingSubmission() {
    const formData = {
        service: document.getElementById('service').value,
        date: document.getElementById('date').value,
        time: document.getElementById('time').value,
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value
    };

    // Here you would typically send this data to your backend
    // For now, we'll just show a success message
    alert('Bedankt voor uw reservering! We nemen zo spoedig mogelijk contact met u op voor bevestiging.');
    document.getElementById('appointmentForm').reset();
}

function initializeMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    
    hamburger.addEventListener('click', function() {
        navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
        this.classList.toggle('active');
    });
}

function initializeSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Add animation on scroll
window.addEventListener('scroll', function() {
    const elements = document.querySelectorAll('.service-card, .info-card');
    elements.forEach(element => {
        const position = element.getBoundingClientRect();
        if (position.top < window.innerHeight * 0.75) {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }
    });
});
