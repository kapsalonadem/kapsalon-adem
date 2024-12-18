document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded');
    
    // Initialize the booking system
    initializeBookingSystem();
    
    // Handle mobile menu
    initializeMobileMenu();
    
    // Handle smooth scrolling
    initializeSmoothScroll();

    // Initialize language switching
    initializeLanguageSelector();
    
    // Update content with current language
    updateContent(currentLanguage);
});

function initializeBookingSystem() {
    console.log('Initializing booking system...');
    
    const timeSelect = document.getElementById('time');
    const dateInput = document.getElementById('date');
    const barberSelect = document.getElementById('barber');
    const form = document.getElementById('appointmentForm');

    if (!timeSelect || !dateInput || !barberSelect || !form) {
        console.error('Missing required form elements');
        return;
    }

    // Set minimum date to today and maximum date to 3 months from now
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const threeMonthsFromNow = new Date(today);
    threeMonthsFromNow.setMonth(today.getMonth() + 3);

    // Format dates for the input
    dateInput.min = tomorrow.toISOString().split('T')[0];
    dateInput.max = threeMonthsFromNow.toISOString().split('T')[0];

    // Set default value to tomorrow
    dateInput.value = tomorrow.toISOString().split('T')[0];

    // Disable weekends
    dateInput.addEventListener('input', function(e) {
        const selectedDate = new Date(this.value);
        const day = selectedDate.getDay();
        
        // If weekend (0 = Sunday, 6 = Saturday)
        if(day === 0 || day === 6) {
            alert(translations[currentLanguage].booking.weekendAlert || 'Please select a weekday. We are closed on weekends.');
            this.value = ''; // Clear the invalid date
            return;
        }

        if (barberSelect.value) {
            generateTimeSlots();
        }
    });

    barberSelect.addEventListener('change', function() {
        console.log('Barber changed:', this.value);
        if (dateInput.value) {
            generateTimeSlots();
        }
    });

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        handleBookingSubmission();
    });

    // Initialize time slots if both date and barber are selected
    if (dateInput.value && barberSelect.value) {
        generateTimeSlots();
    }
}

async function generateTimeSlots() {
    console.log('Generating time slots...');
    const dateInput = document.getElementById('date');
    const timeSelect = document.getElementById('time');
    const barberSelect = document.getElementById('barber');

    if (!dateInput || !timeSelect || !barberSelect) {
        console.error('Missing form elements');
        return;
    }

    const selectedDate = dateInput.value;
    const selectedBarber = barberSelect.value;

    if (!selectedDate || !selectedBarber) {
        console.error('Date or barber not selected');
        return;
    }

    console.log('Selected date:', selectedDate);
    console.log('Selected barber:', selectedBarber);

    // Show loading state
    timeSelect.disabled = true;
    timeSelect.innerHTML = '<option value="">Loading...</option>';

    // Generate time slots from 09:00 to 17:30 with 30-minute intervals
    const startTime = 9 * 60; // 09:00 in minutes
    const endTime = 17 * 60 + 30; // 17:30 in minutes
    const interval = 30; // 30 minutes

    try {
        // Get booked appointments
        const response = await fetch(`https://kapsalon-adem.onrender.com/api/appointments/${selectedDate}`);
        const bookedAppointments = response.ok ? await response.json() : [];
        
        console.log('Booked appointments:', bookedAppointments);

        // Clear and re-enable select
        timeSelect.disabled = false;
        timeSelect.innerHTML = '<option value="" data-translate="booking.form.selectTime">Select time</option>';

        // Generate all possible time slots
        for (let time = startTime; time <= endTime - interval; time += interval) {
            const hours = Math.floor(time / 60);
            const minutes = time % 60;
            const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            
            // Check if this time slot is available
            const isBooked = bookedAppointments.some(apt => 
                apt.time === timeString && 
                apt.barber === selectedBarber
            );

            if (!isBooked) {
                const option = document.createElement('option');
                option.value = timeString;
                option.textContent = timeString;
                timeSelect.appendChild(option);
            }
        }

        // If no slots are available, show message
        if (timeSelect.options.length === 1) {
            const option = document.createElement('option');
            option.value = "";
            option.disabled = true;
            option.textContent = translations[currentLanguage].booking.form.noTimeSlots || 'No available time slots';
            timeSelect.appendChild(option);
        }

        // Update translations
        updateContent(currentLanguage);
    } catch (error) {
        console.error('Error fetching appointments:', error);
        timeSelect.disabled = false;
        timeSelect.innerHTML = '<option value="" data-translate="booking.form.errorLoading">Error loading time slots</option>';
        updateContent(currentLanguage);
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
    const navLinksItems = document.querySelectorAll('.nav-links a');

    if (!hamburger || !navLinks) {
        console.error('Mobile menu elements not found');
        return;
    }

    // Toggle menu on hamburger click
    hamburger.addEventListener('click', function(e) {
        e.stopPropagation();
        hamburger.classList.toggle('active');
        navLinks.classList.toggle('active');
        document.body.classList.toggle('menu-open');
    });

    // Close menu when clicking on a link
    navLinksItems.forEach(item => {
        item.addEventListener('click', function() {
            hamburger.classList.remove('active');
            navLinks.classList.remove('active');
            document.body.classList.remove('menu-open');
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!navLinks.contains(e.target) && !hamburger.contains(e.target)) {
            hamburger.classList.remove('active');
            navLinks.classList.remove('active');
            document.body.classList.remove('menu-open');
        }
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
