import config from '../config.js';

// Mobile Menu Toggle
function initializeMobileMenu() {
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');

    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            mainContent.classList.toggle('sidebar-active');
        });

        // Close sidebar when clicking outside
        mainContent.addEventListener('click', () => {
            if (sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
                mainContent.classList.remove('sidebar-active');
            }
        });
    }
}

// Tab Navigation
function initializeTabs() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = item.getAttribute('data-tab');

            // Update active states
            navItems.forEach(nav => nav.classList.remove('active'));
            tabContents.forEach(tab => tab.classList.remove('active'));

            item.classList.add('active');
            document.getElementById(tabId).classList.add('active');

            // Close mobile menu after navigation
            if (window.innerWidth <= 768) {
                document.querySelector('.sidebar').classList.remove('active');
                document.querySelector('.main-content').classList.remove('sidebar-active');
            }
        });
    });
}

// Services Management
function initializeServices() {
    const addServiceBtn = document.getElementById('addServiceBtn');
    const serviceForm = document.getElementById('serviceForm');
    const servicesTable = document.getElementById('servicesTable');

    // Load services
    loadServices();

    // Add service button
    addServiceBtn.addEventListener('click', () => {
        document.getElementById('serviceModalTitle').textContent = 'Add Service';
        serviceForm.reset();
        openModal('serviceModal');
    });

    // Service form submission
    serviceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = {
            name: document.getElementById('serviceName').value,
            duration: document.getElementById('serviceDuration').value,
            price: document.getElementById('servicePrice').value,
            description: document.getElementById('serviceDescription').value
        };

        try {
            await saveService(formData);
            closeModal('serviceModal');
            loadServices();
        } catch (error) {
            console.error('Error saving service:', error);
        }
    });
}

// Bookings Management
function initializeBookings() {
    const bookingDate = document.getElementById('bookingDate');
    const bookingStatus = document.getElementById('bookingStatus');
    const bookingsTable = document.getElementById('bookingsTable');

    // Set default date to today
    bookingDate.valueAsDate = new Date();

    // Load bookings
    loadBookings();

    // Filter change handlers
    bookingDate.addEventListener('change', loadBookings);
    bookingStatus.addEventListener('change', loadBookings);
}

// Schedule Management
function initializeSchedule() {
    const scheduleGrid = document.querySelector('.schedule-grid');
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    days.forEach(day => {
        const daySchedule = createDaySchedule(day);
        scheduleGrid.appendChild(daySchedule);
    });

    loadSchedule();
}

// Holiday Management
function initializeHolidays() {
    const addHolidayBtn = document.getElementById('addHolidayBtn');
    const holidayDate = document.getElementById('holidayDate');
    const holidayReason = document.getElementById('holidayReason');
    const holidaysTable = document.getElementById('holidaysTable');

    // Load holidays
    loadHolidays();

    // Add holiday button
    addHolidayBtn.addEventListener('click', async () => {
        if (!holidayDate.value || !holidayReason.value) {
            alert('Please fill in all fields');
            return;
        }

        try {
            await saveHoliday({
                date: holidayDate.value,
                reason: holidayReason.value
            });
            holidayDate.value = '';
            holidayReason.value = '';
            loadHolidays();
        } catch (error) {
            console.error('Error saving holiday:', error);
        }
    });
}

// Translation Management
function initializeTranslations() {
    const langTabs = document.querySelectorAll('.lang-tab');
    const translationFields = document.getElementById('translationFields');

    // Load translations
    loadTranslations();

    // Language tab click handlers
    langTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const lang = tab.getAttribute('data-lang');
            langTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            showTranslations(lang);
        });
    });
}

// Settings Management
function initializeSettings() {
    const settingsForm = document.querySelector('.settings-form');
    const saveSettingsBtn = document.getElementById('saveSettings');

    // Load settings
    loadSettings();

    // Save settings
    saveSettingsBtn.addEventListener('click', async () => {
        const settings = {
            businessName: document.getElementById('businessName').value,
            address: document.getElementById('businessAddress').value,
            phone: document.getElementById('businessPhone').value,
            email: document.getElementById('businessEmail').value,
            timeSlotDuration: document.getElementById('timeSlotDuration').value
        };

        try {
            await saveSettings(settings);
            alert('Settings saved successfully');
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Error saving settings');
        }
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
            const response = await fetch(`${config.apiUrl}/api/admin/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
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
        const response = await fetch(`${config.apiUrl}/api/admin/dashboard/stats`, {
            credentials: 'include'
        });
        const stats = await response.json();

        document.getElementById('todayBookings').textContent = stats.todayBookings;
        document.getElementById('totalCustomers').textContent = stats.totalCustomers;
        document.getElementById('todayRevenue').textContent = `€${stats.todayRevenue}`;

        // Load recent bookings
        const recentBookingsTable = document.getElementById('recentBookingsTable');
        recentBookingsTable.innerHTML = stats.recentBookings.map(booking => `
            <tr>
                <td>${formatTime(booking.time)}</td>
                <td>${booking.customer}</td>
                <td>${booking.service}</td>
                <td><span class="status-badge ${booking.status.toLowerCase()}">${booking.status}</span></td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// Helper Functions
function formatTime(time) {
    return new Date(time).toLocaleTimeString('nl-NL', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// API Functions
const API_URL = config.apiUrl;

async function saveService(serviceData) {
    const response = await fetch(`${API_URL}/api/admin/services`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(serviceData)
    });
    return response.json();
}

async function loadServices() {
    try {
        const response = await fetch(`${API_URL}/api/admin/services`, {
            credentials: 'include'
        });
        const services = await response.json();
        const servicesTable = document.getElementById('servicesTable');
        
        servicesTable.innerHTML = services.map(service => `
            <tr>
                <td>${service.name}</td>
                <td>${service.duration} min</td>
                <td>€${service.price}</td>
                <td>
                    <button class="btn-secondary" onclick="editService(${service.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-secondary" onclick="deleteService(${service.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading services:', error);
    }
}

async function loadBookings() {
    try {
        const response = await fetch(`${API_URL}/api/admin/bookings`, {
            credentials: 'include'
        });
        const bookings = await response.json();
        const bookingsTable = document.getElementById('bookingsTable');
        
        bookingsTable.innerHTML = bookings.map(booking => `
            <tr>
                <td>${formatTime(booking.time)}</td>
                <td>${booking.customer}</td>
                <td>${booking.service}</td>
                <td><span class="status-badge ${booking.status.toLowerCase()}">${booking.status}</span></td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading bookings:', error);
    }
}

async function loadSchedule() {
    try {
        const response = await fetch(`${API_URL}/api/admin/schedule`, {
            credentials: 'include'
        });
        const schedule = await response.json();
        const scheduleGrid = document.querySelector('.schedule-grid');
        
        scheduleGrid.innerHTML = schedule.map(day => `
            <div class="day-schedule">
                <h2>${day.day}</h2>
                <ul>
                    ${day.timeSlots.map(timeSlot => `
                        <li>
                            <span>${formatTime(timeSlot.time)}</span>
                            <span>${timeSlot.service}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading schedule:', error);
    }
}

async function loadHolidays() {
    try {
        const response = await fetch(`${API_URL}/api/admin/holidays`, {
            credentials: 'include'
        });
        const holidays = await response.json();
        const holidaysTable = document.getElementById('holidaysTable');
        
        holidaysTable.innerHTML = holidays.map(holiday => `
            <tr>
                <td>${holiday.date}</td>
                <td>${holiday.reason}</td>
                <td>
                    <button class="btn-secondary" onclick="deleteHoliday(${holiday.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading holidays:', error);
    }
}

async function loadTranslations() {
    try {
        const response = await fetch(`${API_URL}/api/admin/translations`, {
            credentials: 'include'
        });
        const translations = await response.json();
        const translationFields = document.getElementById('translationFields');
        
        translationFields.innerHTML = translations.map(translation => `
            <div class="translation-field">
                <label>${translation.label}</label>
                <input type="text" value="${translation.value}" />
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading translations:', error);
    }
}

async function saveSettings(settings) {
    const response = await fetch(`${API_URL}/api/admin/settings`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(settings)
    });
    return response.json();
}

async function saveHoliday(holiday) {
    const response = await fetch(`${API_URL}/api/admin/holidays`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(holiday)
    });
    return response.json();
}

// Initialize all components
document.addEventListener('DOMContentLoaded', function() {
    initializeMobileMenu();
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
