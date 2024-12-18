document.addEventListener('DOMContentLoaded', function() {
    // Initialize the booking system
    initializeBookingSystem();
    
    // Handle mobile menu
    initializeMobileMenu();
    
    // Handle smooth scrolling
    initializeSmoothScroll();

    // Initialize language switching
    initializeLanguageSwitch();
    
    // Initialize language selector
    initializeLanguageSelector();
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

async function generateTimeSlots() {
    const dateInput = document.getElementById('date');
    const timeSelect = document.getElementById('time');
    const barberSelect = document.getElementById('barber').value;
    const selectedDate = dateInput.value;

    timeSelect.innerHTML = `<option value="">${translations[currentLanguage].booking.form.selectTime || 'Select time'}</option>`;
    
    if (!selectedDate) return;

    // Get booked appointments for the selected date
    try {
        const response = await fetch(`https://kapsalon-adem.onrender.com/api/appointments/${selectedDate}`);
        const bookedAppointments = await response.json();

        // Generate time slots from 09:00 to 17:30 with 30-minute intervals
        const startTime = 9 * 60; // 09:00 in minutes
        const endTime = 17 * 60 + 30; // 17:30 in minutes
        const interval = 30; // 30 minutes

        for (let time = startTime; time <= endTime - interval; time += interval) {
            const hours = Math.floor(time / 60);
            const minutes = time % 60;
            const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            
            // Check if this time slot is available
            const isBooked = bookedAppointments.some(apt => 
                apt.time === timeString && 
                apt.barber === barberSelect
            );

            if (!isBooked) {
                const option = document.createElement('option');
                option.value = timeString;
                option.textContent = timeString;
                timeSelect.appendChild(option);
            }
        }
    } catch (error) {
        console.error('Error fetching appointments:', error);
    }
}

async function handleBookingSubmission() {
    const service = document.getElementById('service').value;
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value;
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const barber = document.getElementById('barber').value;

    const appointmentData = {
        service,
        date,
        time,
        name,
        email,
        phone,
        barber,
        language: currentLanguage
    };

    try {
        // First check availability
        const availabilityResponse = await fetch('https://kapsalon-adem.onrender.com/api/check-availability', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                date: appointmentData.date,
                time: appointmentData.time,
                barber: appointmentData.barber
            }),
        });

        const availabilityData = await availabilityResponse.json();

        if (!availabilityData.available) {
            alert(translations[currentLanguage].booking.timeNotAvailable || 'This time slot is not available. Please choose another time.');
            return;
        }

        const response = await fetch('https://kapsalon-adem.onrender.com/api/appointments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(appointmentData)
        });

        if (response.ok) {
            const result = await response.json();
            alert(translations[currentLanguage].booking.success || 'Appointment confirmed! Check your email for details.');
            document.getElementById('appointmentForm').reset();
        } else {
            const error = await response.json();
            alert(translations[currentLanguage].booking.error || 'Error creating appointment. Please try again.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert(translations[currentLanguage].booking.error || 'Error creating appointment. Please try again.');
    }
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

// Language switching functionality
let currentLanguage = localStorage.getItem('language') || 'nl';

function initializeLanguageSwitch() {
    const languageSwitch = document.querySelector('.language-switch');
    if (languageSwitch) {
        languageSwitch.addEventListener('click', toggleLanguage);
        updateContent(currentLanguage);
    }
}

function toggleLanguage() {
    currentLanguage = currentLanguage === 'nl' ? 'en' : 'nl';
    localStorage.setItem('language', currentLanguage);
    updateContent(currentLanguage);
}

function updateContent(lang) {
    // Handle both data-translate and data-i18n attributes during transition
    const elements = document.querySelectorAll('[data-translate], [data-i18n]');
    elements.forEach(element => {
        const key = element.dataset.translate || element.dataset.i18n;
        const keys = key.split('.');
        let translation = translations[lang];
        keys.forEach(k => {
            translation = translation[k];
        });
        if (translation) {
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.placeholder = translation;
            } else {
                element.textContent = translation;
            }
        }
    });
}

// Language selector functionality
function initializeLanguageSelector() {
    const languageSelector = document.querySelector('.language-selector');
    const currentLang = languageSelector.querySelector('.current-lang');
    const dropdown = languageSelector.querySelector('.lang-dropdown');
    const dropdownItems = languageSelector.querySelectorAll('.lang-dropdown li');

    // Toggle dropdown
    currentLang.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
    });

    // Handle language selection
    dropdownItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const lang = item.getAttribute('data-lang');
            const flag = item.querySelector('img').src;
            const text = lang.toUpperCase();

            // Update current language button
            currentLang.querySelector('img').src = flag;
            currentLang.querySelector('span').textContent = text;

            // Update active state
            dropdownItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // Hide dropdown
            dropdown.classList.remove('show');

            // Update content
            toggleLanguage();
        });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        dropdown.classList.remove('show');
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
