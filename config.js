const config = {
    apiUrl: window.location.hostname === 'ademkapsalon.netlify.app'
        ? 'https://kapsalon-adem.onrender.com'
        : 'http://localhost:3000',
    defaultHeaders: {
        'Content-Type': 'application/json'
    },
    adminEndpoints: {
        login: '/api/admin/login',
        logout: '/api/admin/logout',
        checkAuth: '/api/admin/check-auth',
        dashboard: '/api/admin/dashboard'
    }
};

export default config;
