const express = require('express');
const { OAuth2 } = require('discord-oauth2');
const oauth = new OAuth2();
const app = express();

const clientId = '1389852325648007290';
const clientSecret = 'dWOJvWCWiFWTKiw7xmrQa1iLoY7Pd6Ng';
const redirectUri = 'https://blake0v2.github.io/TheArchAngels/dashboard.html'; // Your redirect URL

// Serve the static frontend (if you deploy to GitHub Pages)
app.use(express.static('public'));

// OAuth2 Login Route
app.get('/oauth2/login', (req, res) => {
    const discordOAuthURL = `https://discord.com/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=identify`;

    // Redirect the user directly to Discord's OAuth2 authorization page
    res.redirect(discordOAuthURL);
});

// Example API for fetching current raid
app.get('/api/current-raid', (req, res) => {
    // Example raid data
    res.json({
        name: "Snow Island Raid",
        description: "The air turns to frost! Join now!"
    });
});

app.listen(8000, () => {
    console.log('Server running on https://blake0v2.github.io/TheArchAngels/dashboard.html');
});
