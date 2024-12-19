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
    
    // Initialize all components
    initializeBookingSystem();
    initializeMobileMenu();
    initializeSmoothScroll();
    initializeLanguageSelector();
    
    // Handle responsive navigation
    handleResponsiveNav();
});

// Booking system functionality
function initializeBookingSystem() {
    const form = document.getElementById('booking-form');
    const dateInput = document.getElementById('date');
    const timeSelect = document.getElementById('time');
    const barberSelect = document.getElementById('barber');
    const serviceSelect = document.getElementById('service');

    // Set min date to today
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.min = tomorrow.toISOString().split('T')[0];

    // Set max date to 2 weeks from now
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 14);
    dateInput.max = maxDate.toISOString().split('T')[0];

    // Event listeners
    dateInput.addEventListener('change', updateTimeSlots);
    barberSelect.addEventListener('change', updateTimeSlots);
    serviceSelect.addEventListener('change', updateTimeSlots);

    form.addEventListener('submit', handleBookingSubmission);
}

function updateTimeSlots() {
    const timeSelect = document.getElementById('time');
    const dateInput = document.getElementById('date');
    const barberSelect = document.getElementById('barber');
    const serviceSelect = document.getElementById('service');

    // Clear existing options
    timeSelect.innerHTML = '<option value="" data-translate="booking.form.selectTime">Select a time</option>';
    
    // Check if all required fields are filled
    if (!dateInput.value || !barberSelect.value || !serviceSelect.value) {
        timeSelect.disabled = true;
        return;
    }

    // Enable time selection
    timeSelect.disabled = false;

    // Generate time slots from 9:00 to 17:30 with 30-minute intervals
    const startTime = 9 * 60; // 9:00 in minutes
    const endTime = 17 * 60 + 30; // 17:30 in minutes
    const interval = 30; // 30 minutes

    for (let time = startTime; time <= endTime; time += interval) {
        const hours = Math.floor(time / 60);
        const minutes = time % 60;
        const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        
        const option = document.createElement('option');
        option.value = timeString;
        option.textContent = timeString;
        timeSelect.appendChild(option);
    }
}

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

function handleBookingSubmission() {
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
    document.getElementById('booking-form').reset();
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
