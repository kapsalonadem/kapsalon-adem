# Kapsalon Adem - Barbershop Website

Modern barbershop website with online booking system for Kapsalon Adem in Rotterdam.

## Features

- Online booking system
- Email notifications
- Admin dashboard
- Multi-language support (Dutch/English)
- Responsive design

## Setup Instructions

### 1. Website Setup

The website is hosted on Netlify at [ademkapsalon.netlify.app](https://ademkapsalon.netlify.app)

### 2. Admin Access

1. Go to [ademkapsalon.netlify.app/admin](https://ademkapsalon.netlify.app/admin)
2. Login with your admin credentials

### 3. Email Notifications Setup

To receive booking notifications and send confirmation emails:

#### Option A: Using Gmail Password (Less Secure)

1. Go to [Google Account Settings](https://myaccount.google.com/security)
2. Scroll down to "Less secure app access"
3. Turn ON "Allow less secure apps"
4. Update your `.env` file with:
   ```
   EMAIL_USER=kapsalonadem@gmail.com
   EMAIL_PASSWORD=your_gmail_password
   ```

#### Option B: Using App Password (Recommended)

1. Go to [Google Account Settings](https://myaccount.google.com/security)
2. Enable "2-Step Verification" if not already enabled
3. Scroll down to "App passwords"
4. Click "Create new app password"
5. Select "Other (Custom name)" and enter "Kapsalon Adem"
6. Copy the 16-digit password
7. Update your `.env` file with:
   ```
   EMAIL_USER=kapsalonadem@gmail.com
   EMAIL_PASSWORD=your_16_digit_app_password
   ```

### 4. Environment Variables

Create a `.env` file with the following:

```env
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://ademkapsalon.netlify.app
ADMIN_USERNAME=kapsalonadem@gmail.com
ADMIN_PASSWORD=your_admin_password
EMAIL_USER=kapsalonadem@gmail.com
EMAIL_PASSWORD=your_email_password
```

## Support

For technical support, contact the development team.
