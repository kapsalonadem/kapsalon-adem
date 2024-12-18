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

async function handleBookingSubmission() {
    const formData = {
        service: document.getElementById('service').value,
        date: document.getElementById('date').value,
        time: document.getElementById('time').value,
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        barber: document.getElementById('barber').value
    };

    try {
        // First check availability
        const availabilityResponse = await fetch('/api/check-availability', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                date: formData.date,
                time: formData.time,
                barber: formData.barber
            }),
        });

        const availabilityData = await availabilityResponse.json();

        if (!availabilityData.available) {
            alert('Deze tijd is helaas niet meer beschikbaar. Kies alstublieft een andere tijd.');
            return;
        }

        // If available, create the appointment
        const response = await fetch('/api/appointments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
        });

        if (response.ok) {
            alert('Bedankt voor uw reservering! U ontvangt binnen enkele minuten een bevestigingsmail.');
            document.getElementById('appointmentForm').reset();
        } else {
            alert('Er is een fout opgetreden bij het maken van de afspraak. Probeer het later opnieuw.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Er is een fout opgetreden bij het maken van de afspraak. Probeer het later opnieuw.');
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
    const elements = document.querySelectorAll('[data-translate]');
    elements.forEach(element => {
        const key = element.dataset.translate;
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