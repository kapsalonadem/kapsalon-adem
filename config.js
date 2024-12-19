const config = {
    apiUrl: window.location.hostname === 'ademkapsalon.netlify.app'
        ? 'https://kapsalon-adem.onrender.com'
        : 'http://localhost:3000'
};

export default config;
