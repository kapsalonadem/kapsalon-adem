document.addEventListener('DOMContentLoaded', function() {
    // Initialize mobile navigation
    initMobileNav();
    
    // Initialize booking system
    initBookingSystem();
    
    // Initialize scroll effects
    initScrollEffects();
});

function initMobileNav() {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
            }
        });

        // Close menu when clicking a link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }
    
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            mobileMenuBtn.classList.toggle('active');
        });
    }
}

function initScrollEffects() {
    const navbar = document.querySelector('.navbar');
    let lastScrollTop = 0;

    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        lastScrollTop = scrollTop;
    });

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                // Close mobile menu if open
                const navLinks = document.querySelector('.nav-links');
                const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
                navLinks.classList.remove('active');
                mobileMenuBtn.classList.remove('active');
            }
        });
    });
}

function initBookingSystem() {
    const calendar = document.getElementById('calendar');
    const timeSlots = document.getElementById('time-slots');
    const bookingForm = document.getElementById('booking-form');
    
    if (!calendar || !timeSlots || !bookingForm) return;

    // Initialize FullCalendar
    const calendarInstance = new FullCalendar.Calendar(calendar, {
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
            right: 'dayGridMonth'
        }
    });

    calendarInstance.render();

    // Handle form submission
    bookingForm.addEventListener('submit', handleBookingSubmission);
}

async function handleDateSelect(selectInfo) {
    const selectedDate = selectInfo.startStr;
    const timeSlots = document.getElementById('time-slots');
    
    // Clear previous time slots
    timeSlots.innerHTML = '';
    
    // Available time slots (9:00 - 18:00, 30min intervals)
    const slots = generateTimeSlots();
    
    // Get booked slots for the selected date
    const bookedSlots = await getBookedSlots(selectedDate);
    
    // Create time slot buttons
    slots.forEach(time => {
        const isAvailable = !bookedSlots.includes(time);
        const slot = document.createElement('button');
        slot.type = 'button';
        slot.className = `time-slot ${isAvailable ? '' : 'disabled'}`;
        slot.textContent = time;
        slot.disabled = !isAvailable;
        
        if (isAvailable) {
            slot.addEventListener('click', () => selectTimeSlot(slot, time));
        }
        
        timeSlots.appendChild(slot);
    });
}

function generateTimeSlots() {
    const slots = [];
    const start = 9; // 9:00
    const end = 18; // 18:00
    
    for (let hour = start; hour < end; hour++) {
        slots.push(`${hour.toString().padStart(2, '0')}:00`);
        slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    
    return slots;
}

async function getBookedSlots(date) {
    // This would normally fetch from your backend
    // For now, return some random slots as booked
    return ['10:00', '14:30', '16:00'];
}

function selectTimeSlot(slot, time) {
    // Remove previous selection
    document.querySelectorAll('.time-slot').forEach(s => {
        s.classList.remove('selected');
    });
    
    // Add selection to clicked slot
    slot.classList.add('selected');
    
    // Store selected time
    const timeInput = document.createElement('input');
    timeInput.type = 'hidden';
    timeInput.name = 'selectedTime';
    timeInput.value = time;
    
    const existingTimeInput = document.querySelector('input[name="selectedTime"]');
    if (existingTimeInput) {
        existingTimeInput.remove();
    }
    
    document.getElementById('booking-form').appendChild(timeInput);
}

async function handleBookingSubmission(e) {
    e.preventDefault();
    
    const form = e.target;
    const selectedTime = form.querySelector('input[name="selectedTime"]')?.value;
    
    if (!selectedTime) {
        showNotification('Please select a time slot', 'error');
        return;
    }
    
    const formData = {
        service: form.service.value,
        time: selectedTime,
        name: form.name.value,
        email: form.email.value,
        phone: form.phone.value
    };
    
    try {
        // This would normally send to your backend
        // For now, just show success message
        console.log('Booking data:', formData);
        showNotification('Booking successful! We will contact you shortly.', 'success');
        form.reset();
        document.querySelectorAll('.time-slot').forEach(slot => {
            slot.classList.remove('selected');
        });
    } catch (error) {
        showNotification('Error making booking. Please try again.', 'error');
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Remove notification
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}
