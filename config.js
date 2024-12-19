const config = {
    apiUrl: process.env.NODE_ENV === 'production'
        ? 'https://kapsalon-adem.onrender.com'
        : 'http://localhost:3000'
};

export default config;
