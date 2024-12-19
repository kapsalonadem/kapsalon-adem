document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded');
    
    // Initialize AOS
    AOS.init({
        duration: 800,
        offset: 50,
        once: true,
        mirror: false,
        anchorPlacement: 'top-bottom'
    });
    
    // Initialize the booking system
    initializeBookingSystem();
    
    // Handle mobile menu
    initializeMobileMenu();
    
    // Handle smooth scrolling
    initializeSmoothScroll();
    
    // Initialize language switching
    initializeLanguageSelector();
    
    // Handle responsive navigation
    handleResponsiveNav();
    
    // Update content with current language
    updateContent(currentLanguage);
});

function handleResponsiveNav() {
    const navbar = document.querySelector('.navbar');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll <= 0) {
            navbar.classList.remove('scroll-up');
            return;
        }
        
        if (currentScroll > lastScroll && !navbar.classList.contains('scroll-down')) {
            navbar.classList.remove('scroll-up');
            navbar.classList.add('scroll-down');
        } else if (currentScroll < lastScroll && navbar.classList.contains('scroll-down')) {
            navbar.classList.remove('scroll-down');
            navbar.classList.add('scroll-up');
        }
        
        lastScroll = currentScroll;
    });
}

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
    dateInput.addEventListener('change', function(e) {
        console.log('Date changed:', this.value);
        const selectedDate = new Date(this.value);
        const day = selectedDate.getDay();
        
        // If weekend (0 = Sunday, 6 = Saturday)
        if(day === 0 || day === 6) {
            alert(translations[currentLanguage].booking.weekendAlert || 'Please select a weekday. We are closed on weekends.');
            this.value = ''; // Clear the invalid date
            return;
        }

        if (barberSelect.value) {
            console.log('Calling generateTimeSlots from date change');
            generateTimeSlots();
        }
    });

    barberSelect.addEventListener('change', function() {
        console.log('Barber changed:', this.value);
        if (dateInput.value) {
            console.log('Calling generateTimeSlots from barber change');
            generateTimeSlots();
        }
    });

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        handleBookingSubmission();
    });

    // Initialize time slots if both date and barber are selected
    if (dateInput.value && barberSelect.value) {
        console.log('Initial call to generateTimeSlots');
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

    console.log('Selected date:', selectedDate);
    console.log('Selected barber:', selectedBarber);

    if (!selectedDate || !selectedBarber) {
        console.error('Date or barber not selected');
        return;
    }

    // Show loading state
    timeSelect.disabled = true;
    timeSelect.innerHTML = '<option value="">Loading...</option>';

    // Generate time slots from 09:00 to 17:30 with 30-minute intervals
    const startTime = 9 * 60; // 09:00 in minutes
    const endTime = 17 * 60 + 30; // 17:30 in minutes
    const interval = 30; // 30 minutes

    try {
        // Clear and re-enable select
        timeSelect.disabled = false;
        timeSelect.innerHTML = `<option value="">${translations[currentLanguage].booking.form.selectTime || 'Select time'}</option>`;

        // Generate all time slots
        for (let time = startTime; time <= endTime - interval; time += interval) {
            const hours = Math.floor(time / 60);
            const minutes = time % 60;
            const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            
            const option = document.createElement('option');
            option.value = timeString;
            option.textContent = timeString;
            timeSelect.appendChild(option);
        }

    } catch (error) {
        console.error('Error generating time slots:', error);
        timeSelect.disabled = false;
        timeSelect.innerHTML = `<option value="">${translations[currentLanguage].booking.form.error || 'Error loading time slots'}</option>`;
    }
}

async function handleBookingSubmission() {
    const service = document.getElementById('service').value;
    const barber = document.getElementById('barber').value;
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value;
    const name = document.getElementById('name').value;
    const phone = document.getElementById('phone').value;

    if (!service || !barber || !date || !time || !name || !phone) {
        alert(translations[currentLanguage].booking.form.fillAll || 'Please fill in all fields');
        return;
    }

    // Create appointment object
    const appointment = {
        service,
        barber,
        date,
        time,
        name,
        phone
    };

    console.log('Booking appointment:', appointment);
    alert(translations[currentLanguage].booking.form.success || 'Booking successful! We will contact you to confirm your appointment.');
    
    // Reset form
    document.getElementById('appointmentForm').reset();
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
