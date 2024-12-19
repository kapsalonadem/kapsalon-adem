document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded');
    
    // Initialize AOS
    AOS.init({
        duration: 800,
        once: true
    });

    // DOM Elements
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    const bookingForm = document.getElementById('booking-form');
    const timeSlots = document.getElementById('time-slots');
    const calendar = document.getElementById('calendar');

    // Mobile Navigation
    hamburger?.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });

    // Initialize FullCalendar
    let calendarInstance = null;
    if (calendar) {
        calendarInstance = new FullCalendar.Calendar(calendar, {
            initialView: 'dayGridMonth',
            selectable: true,
            selectMirror: true,
            weekends: true,
            businessHours: {
                daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
                startTime: '09:00',
                endTime: '18:00',
            },
            select: handleDateSelect,
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek'
            }
        });
        calendarInstance.render();
    }

    // Available time slots
    const timeSlotsList = [
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
        '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
    ];

    // Handle date selection
    async function handleDateSelect(selectInfo) {
        const selectedDate = selectInfo.startStr;
        document.getElementById('date').value = selectedDate;
        
        // Clear previous time slots
        timeSlots.innerHTML = '';
        
        // Get available slots for the selected date
        const availableSlots = await getAvailableTimeSlots(selectedDate);
        
        // Create time slot buttons
        timeSlotsList.forEach(time => {
            const isAvailable = availableSlots.includes(time);
            const slot = document.createElement('button');
            slot.type = 'button';
            slot.className = `time-slot ${isAvailable ? '' : 'disabled'}`;
            slot.textContent = time;
            slot.disabled = !isAvailable;
            
            if (isAvailable) {
                slot.addEventListener('click', () => handleTimeSlotSelect(slot, time));
            }
            
            timeSlots.appendChild(slot);
        });
    }

    // Handle time slot selection
    function handleTimeSlotSelect(slot, time) {
        // Remove previous selection
        document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
        
        // Add selection to clicked slot
        slot.classList.add('selected');
        
        // Update hidden time input
        const timeInput = document.createElement('input');
        timeInput.type = 'hidden';
        timeInput.name = 'time';
        timeInput.value = time;
        
        // Replace existing time input or add new one
        const existingTimeInput = bookingForm.querySelector('input[name="time"]');
        if (existingTimeInput) {
            existingTimeInput.remove();
        }
        bookingForm.appendChild(timeInput);
    }

    // Get available time slots for a date
    async function getAvailableTimeSlots(date) {
        try {
            const response = await fetch(`/api/available-slots?date=${date}`);
            if (response.ok) {
                return await response.json();
            }
            return timeSlotsList; // Return all slots if API fails
        } catch (error) {
            console.error('Error fetching available slots:', error);
            return timeSlotsList; // Return all slots if API fails
        }
    }

    // Form submission
    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitButton = bookingForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Booking...';
            
            // Get form data
            const formData = new FormData(bookingForm);
            const bookingData = Object.fromEntries(formData.entries());
            
            try {
                const response = await fetch('/api/bookings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(bookingData)
                });
                
                if (response.ok) {
                    // Show success message
                    showNotification('Booking confirmed! Check your email for details.', 'success');
                    bookingForm.reset();
                    timeSlots.innerHTML = '';
                    calendarInstance.unselect();
                } else {
                    // Show error message
                    const error = await response.json();
                    showNotification(error.message || 'Booking failed. Please try again.', 'error');
                }
            } catch (error) {
                console.error('Booking error:', error);
                showNotification('Network error. Please try again.', 'error');
            } finally {
                submitButton.disabled = false;
                submitButton.innerHTML = 'Book Now';
            }
        });
    }

    // Show notification
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    // Language selector
    const langSelector = document.querySelector('.language-selector');
    const currentLang = document.querySelector('.current-lang');
    const langDropdown = document.querySelector('.lang-dropdown');

    if (langSelector && currentLang && langDropdown) {
        currentLang.addEventListener('click', () => {
            langDropdown.classList.toggle('show');
        });

        document.addEventListener('click', (e) => {
            if (!langSelector.contains(e.target)) {
                langDropdown.classList.remove('show');
            }
        });

        langDropdown.addEventListener('click', (e) => {
            const langItem = e.target.closest('li');
            if (langItem) {
                const lang = langItem.dataset.lang;
                setLanguage(lang);
                updateLanguageUI(lang);
                langDropdown.classList.remove('show');
            }
        });
    }

    // Update language UI
    function updateLanguageUI(lang) {
        const currentFlag = currentLang.querySelector('img');
        const currentText = currentLang.querySelector('span');
        const selectedLang = langDropdown.querySelector(`[data-lang="${lang}"]`);
        
        if (currentFlag && currentText && selectedLang) {
            currentFlag.src = selectedLang.querySelector('img').src;
            currentText.textContent = lang.toUpperCase();
            
            langDropdown.querySelectorAll('li').forEach(li => {
                li.classList.toggle('active', li.dataset.lang === lang);
            });
        }
    }

    // Set language and translate
    function setLanguage(lang) {
        localStorage.setItem('language', lang);
        translatePage(lang);
    }

    // Initialize language
    const savedLang = localStorage.getItem('language') || 'nl';
    setLanguage(savedLang);
    updateLanguageUI(savedLang);

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

// Offline booking support
const offlineBookingSystem = {
    storageKey: 'offlineBookings',
    
    init() {
        // Check for and sync any offline bookings when coming online
        window.addEventListener('online', () => this.syncOfflineBookings());
        
        // Listen for offline status
        window.addEventListener('offline', () => {
            showNotification('You are offline. Bookings will be synced when connection is restored.');
        });
    },

    async saveBookingLocally(bookingData) {
        try {
            const offlineBookings = this.getOfflineBookings();
            offlineBookings.push({
                ...bookingData,
                offlineId: Date.now(),
                timestamp: new Date().toISOString(),
                synced: false
            });
            localStorage.setItem(this.storageKey, JSON.stringify(offlineBookings));
            return true;
        } catch (error) {
            console.error('Error saving booking locally:', error);
            return false;
        }
    },

    getOfflineBookings() {
        try {
            return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
        } catch {
            return [];
        }
    },

    async syncOfflineBookings() {
        const offlineBookings = this.getOfflineBookings();
        const unsynced = offlineBookings.filter(booking => !booking.synced);
        
        if (unsynced.length === 0) return;

        showNotification(`Syncing ${unsynced.length} offline booking(s)...`);

        for (const booking of unsynced) {
            try {
                const response = await fetch('/api/appointments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(booking)
                });

                if (response.ok) {
                    booking.synced = true;
                    showNotification(`Successfully synced booking for ${booking.name}`);
                }
            } catch (error) {
                console.error('Error syncing offline booking:', error);
            }
        }

        // Update local storage with sync status
        localStorage.setItem(this.storageKey, JSON.stringify(offlineBookings));
    }
};

// Enhanced booking submission with offline support
async function handleBookingSubmission(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const bookingData = Object.fromEntries(formData.entries());

    try {
        if (navigator.onLine) {
            // Online submission
            const response = await fetch('/api/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookingData)
            });

            if (!response.ok) throw new Error('Booking submission failed');

            showNotification('Booking confirmed successfully!');
            form.reset();
        } else {
            // Offline submission
            const saved = await offlineBookingSystem.saveBookingLocally(bookingData);
            if (saved) {
                showNotification('Booking saved offline. Will be synced when connection is restored.');
                form.reset();
            } else {
                throw new Error('Failed to save booking offline');
            }
        }
    } catch (error) {
        console.error('Booking error:', error);
        showNotification('There was an error processing your booking. Please try again or call us directly.');
    }
}

// Initialize offline booking system
offlineBookingSystem.init();

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

// Add notification styles
const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 15px 25px;
        background: #333;
        color: white;
        border-radius: 5px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        z-index: 1000;
        opacity: 1;
        transition: opacity 0.5s;
    }
    .notification.fade-out {
        opacity: 0;
    }
    .notification.success {
        background: #4CAF50;
    }
    .notification.error {
        background: #f44336;
    }
    .notification.info {
        background: #2196F3;
    }
`;
document.head.appendChild(style);

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

// Language translations
const translations = {
    en: {
        'hero.title': 'Welcome to Kapsalon Adem',
        'hero.subtitle': 'Premium Barbershop Experience in Rotterdam',
        'booking.title': 'Book an Appointment',
        'booking.subtitle': 'Choose your preferred time and service',
        // Add more translations
    },
    nl: {
        'hero.title': 'Welkom bij Kapsalon Adem',
        'hero.subtitle': 'Premium Kapperservaring in Rotterdam',
        'booking.title': 'Maak een Afspraak',
        'booking.subtitle': 'Kies je gewenste tijd en service',
        // Add more translations
    },
    tr: {
        'hero.title': 'Kapsalon Adem\'e Hoşgeldiniz',
        'hero.subtitle': 'Rotterdam\'da Premium Berber Deneyimi',
        'booking.title': 'Randevu Al',
        'booking.subtitle': 'Tercih ettiğiniz zaman ve hizmeti seçin',
        // Add more translations
    }
};

// Language switcher functionality
function initializeLanguage() {
    const currentLang = localStorage.getItem('language') || 'en';
    document.documentElement.lang = currentLang;
    updateLanguage(currentLang);

    // Add click handlers to language buttons
    document.querySelectorAll('.language-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.dataset.lang;
            localStorage.setItem('language', lang);
            updateLanguage(lang);
        });
    });
}

function updateLanguage(lang) {
    document.querySelectorAll('[data-translate]').forEach(element => {
        const key = element.dataset.translate;
        if (translations[lang] && translations[lang][key]) {
            element.textContent = translations[lang][key];
        }
    });

    // Update active state of language buttons
    document.querySelectorAll('.language-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });
}

// Service booking link functionality
function initializeServiceBooking() {
    document.querySelectorAll('.service-card').forEach(card => {
        card.addEventListener('click', () => {
            const service = card.dataset.service;
            const serviceSection = document.getElementById('booking');
            serviceSection.scrollIntoView({ behavior: 'smooth' });
            
            // Pre-select the service in the booking form
            const serviceInput = document.querySelector(`input[name="service"][value="${service}"]`);
            if (serviceInput) {
                serviceInput.checked = true;
                updateBookingStep(1); // Move to next step
            }
        });
    });
}
