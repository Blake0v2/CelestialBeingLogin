const express = require('express');
const { OAuth2 } = require('discord-oauth2');
const oauth = new OAuth2();
const app = express();

const clientId = '1389852325648007290';
const clientSecret = 'dWOJvWCWiFWTKiw7xmrQa1iLoY7Pd6Ng';
const redirectUri = 'http://local:8000/oauth2/callback';

// Serve the static frontend (if you deploy to GitHub Pages)
app.use(express.static('public'));

// OAuth2 Login Route
app.get('/oauth2/login', (req, res) => {
    const authUrl = oauth.generateAuthUrl({
        clientId,
        scope: ['identify', 'guilds'],
        redirectUri
    });
    res.redirect(authUrl);
});

// OAuth2 Callback Route
app.get('/oauth2/callback', async (req, res) => {
    try {
        const token = await oauth.tokenRequest({
            clientId,
            clientSecret,
            code: req.query.code,
            redirectUri
        });

        const user = await oauth.getUser(token.access_token);
        res.json(user);

        // Simulate saving the token and user session (should be handled securely)
        // In real use, save to session or database
        res.redirect('/dashboard');
    } catch (error) {
        res.status(500).send('Error during OAuth2 callback.');
    }
});

// Example API for fetching current raid
app.get('/api/current-raid', (req, res) => {
    // Example raid data
    res.json({
        name: "Snow Island Raid",
        description: "The air turns to frost! Join now!"
    });
});

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
