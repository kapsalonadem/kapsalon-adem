document.addEventListener('DOMContentLoaded', function() {
    // Initialize all components
    initializeTabs();
    initializeServices();
    initializeBookings();
    initializeSchedule();
    initializeHolidays();
    initializeTranslations();
    initializeSettings();
    initializePasswordChange();
    loadDashboardStats();
});

// Tab Navigation
function initializeTabs() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetTab = item.getAttribute('data-tab');

            // Update active states
            navItems.forEach(nav => nav.classList.remove('active'));
            tabContents.forEach(tab => tab.classList.remove('active'));

            item.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });
}

// Services Management
function initializeServices() {
    const addServiceBtn = document.getElementById('addServiceBtn');
    const serviceModal = document.getElementById('serviceModal');
    const serviceForm = document.getElementById('serviceForm');
    const cancelServiceBtn = document.getElementById('cancelService');

    // Load existing services
    loadServices();

    // Show modal on add button click
    addServiceBtn.addEventListener('click', () => {
        serviceModal.classList.add('active');
    });

    // Hide modal on cancel
    cancelServiceBtn.addEventListener('click', () => {
        serviceModal.classList.remove('active');
    });

    // Handle form submission
    serviceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = {
            name: document.getElementById('serviceName').value,
            duration: document.getElementById('serviceDuration').value,
            price: document.getElementById('servicePrice').value,
            description: document.getElementById('serviceDescription').value
        };

        saveService(formData);
        serviceModal.classList.remove('active');
        serviceForm.reset();
    });
}

async function loadServices() {
    try {
        const response = await fetch('/api/services');
        const services = await response.json();
        const servicesGrid = document.getElementById('servicesGrid');
        
        servicesGrid.innerHTML = services.map(service => `
            <div class="service-card">
                <h3>${service.name}</h3>
                <p class="price">€${service.price}</p>
                <p class="duration">${service.duration} minutes</p>
                <p class="description">${service.description}</p>
                <div class="card-actions">
                    <button class="btn-secondary" onclick="editService(${service.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-secondary" onclick="deleteService(${service.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading services:', error);
    }
}

// Bookings Management
function initializeBookings() {
    const filterBtn = document.getElementById('filterBookings');
    const bookingDate = document.getElementById('bookingDate');
    const bookingStatus = document.getElementById('bookingStatus');

    filterBtn.addEventListener('click', () => {
        loadBookings(bookingDate.value, bookingStatus.value);
    });

    // Load initial bookings
    loadBookings();
}

async function loadBookings(date = '', status = 'all') {
    try {
        const response = await fetch(`/api/bookings?date=${date}&status=${status}`);
        const bookings = await response.json();
        const bookingsTable = document.getElementById('bookingsTable').getElementsByTagName('tbody')[0];
        
        bookingsTable.innerHTML = bookings.map(booking => `
            <tr>
                <td>${moment(booking.date).format('DD/MM/YYYY')}</td>
                <td>${booking.time}</td>
                <td>${booking.customerName}</td>
                <td>${booking.service}</td>
                <td>
                    <span class="status-badge ${booking.status.toLowerCase()}">
                        ${booking.status}
                    </span>
                </td>
                <td>
                    <button class="btn-secondary" onclick="updateBookingStatus(${booking.id}, 'confirmed')">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn-secondary" onclick="updateBookingStatus(${booking.id}, 'cancelled')">
                        <i class="fas fa-times"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading bookings:', error);
    }
}

// Schedule Management
function initializeSchedule() {
    const saveScheduleBtn = document.getElementById('saveSchedule');
    
    // Load current schedule
    loadSchedule();

    saveScheduleBtn.addEventListener('click', () => {
        const scheduleData = {};
        document.querySelectorAll('.day-schedule').forEach(day => {
            const dayName = day.getAttribute('data-day');
            scheduleData[dayName] = {
                start: day.querySelector('.start-time').value,
                end: day.querySelector('.end-time').value,
                breakStart: day.querySelector('.break-start').value,
                breakEnd: day.querySelector('.break-end').value
            };
        });

        saveSchedule(scheduleData);
    });
}

// Holidays Management
function initializeHolidays() {
    const addHolidayBtn = document.getElementById('addHoliday');
    const holidayDate = document.getElementById('holidayDate');
    const holidayReason = document.getElementById('holidayReason');

    loadHolidays();

    addHolidayBtn.addEventListener('click', () => {
        if (holidayDate.value && holidayReason.value) {
            addHoliday({
                date: holidayDate.value,
                reason: holidayReason.value
            });
            holidayDate.value = '';
            holidayReason.value = '';
        }
    });
}

// Translations Management
function initializeTranslations() {
    const langTabs = document.querySelectorAll('.lang-tab');
    const saveTranslationsBtn = document.getElementById('saveTranslations');

    loadTranslations();

    langTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const lang = tab.getAttribute('data-lang');
            langTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadTranslationFields(lang);
        });
    });

    saveTranslationsBtn.addEventListener('click', saveTranslations);
}

// Settings Management
function initializeSettings() {
    const saveSettingsBtn = document.getElementById('saveSettings');
    
    // Load current settings
    loadSettings();

    saveSettingsBtn.addEventListener('click', () => {
        const settings = {
            businessName: document.getElementById('businessName').value,
            address: document.getElementById('businessAddress').value,
            phone: document.getElementById('businessPhone').value,
            email: document.getElementById('businessEmail').value,
            timeSlotDuration: document.getElementById('timeSlotDuration').value
        };

        saveSettings(settings);
    });
}

// Password Change
function initializePasswordChange() {
    const changePasswordForm = document.getElementById('changePasswordForm');
    const passwordError = document.getElementById('passwordError');

    changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        passwordError.textContent = '';
        passwordError.style.display = 'none';

        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Validate passwords
        if (newPassword !== confirmPassword) {
            passwordError.textContent = 'New passwords do not match';
            passwordError.style.display = 'block';
            return;
        }

        if (newPassword.length < 8) {
            passwordError.textContent = 'New password must be at least 8 characters long';
            passwordError.style.display = 'block';
            return;
        }

        try {
            const response = await fetch('/api/admin/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert('Password changed successfully!');
                changePasswordForm.reset();
            } else {
                passwordError.textContent = data.message;
                passwordError.style.display = 'block';
            }
        } catch (error) {
            console.error('Error changing password:', error);
            passwordError.textContent = 'Error changing password. Please try again.';
            passwordError.style.display = 'block';
        }
    });
}

// Dashboard Stats
async function loadDashboardStats() {
    try {
        const response = await fetch('/api/dashboard/stats');
        const stats = await response.json();
        
        document.getElementById('todayBookings').textContent = stats.todayBookings;
        document.getElementById('totalCustomers').textContent = stats.totalCustomers;
        document.getElementById('todayRevenue').textContent = `€${stats.todayRevenue}`;
        
        // Load recent bookings
        const recentBookings = await fetch('/api/dashboard/recent-bookings');
        const bookings = await recentBookings.json();
        
        const recentBookingsTable = document.getElementById('recentBookingsTable').getElementsByTagName('tbody')[0];
        recentBookingsTable.innerHTML = bookings.map(booking => `
            <tr>
                <td>${moment(booking.date).format('DD/MM/YYYY')}</td>
                <td>${booking.time}</td>
                <td>${booking.customerName}</td>
                <td>${booking.service}</td>
                <td>
                    <span class="status-badge ${booking.status.toLowerCase()}">
                        ${booking.status}
                    </span>
                </td>
                <td>
                    <button class="btn-secondary" onclick="viewBookingDetails(${booking.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// API Functions
async function saveService(serviceData) {
    try {
        const response = await fetch('/api/services', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(serviceData)
        });
        
        if (response.ok) {
            loadServices();
        }
    } catch (error) {
        console.error('Error saving service:', error);
    }
}

async function saveSchedule(scheduleData) {
    try {
        const response = await fetch('/api/schedule', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(scheduleData)
        });
        
        if (response.ok) {
            alert('Schedule saved successfully!');
        }
    } catch (error) {
        console.error('Error saving schedule:', error);
    }
}

async function addHoliday(holidayData) {
    try {
        const response = await fetch('/api/holidays', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(holidayData)
        });
        
        if (response.ok) {
            loadHolidays();
        }
    } catch (error) {
        console.error('Error adding holiday:', error);
    }
}

async function saveSettings(settingsData) {
    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settingsData)
        });
        
        if (response.ok) {
            alert('Settings saved successfully!');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

// Utility Functions
function showLoading() {
    // Implement loading indicator
}

function hideLoading() {
    // Hide loading indicator
}

function showError(message) {
    // Implement error message display
}

// Initialize tooltips and other UI elements
function initializeUI() {
    // Add any additional UI initialization here
}
