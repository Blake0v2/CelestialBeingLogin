require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const path = require('path');
const url = require('url');
const { OAuth2 } = require('discord-oauth2');
const oauth = new OAuth2();
const app = express();

// Environment Variables
const CLIENT_ID = '1389852325648007290';
const CLIENT_SECRET = 'v5H1dQm0hC3vjep1AThH7j47CiHvtkU2';
const REDIRECT_URI = 'http://localhost:8000/api/auth/discord/redirect';
const GUILD_ID = '1365848012194316312';
const ADMIN_ROLE_IDS = '1365851423081762897';
const DISCORD_API_BASE = 'https://discord.com/api/v10';

// In-memory sessions for simplicity
let sessions = {};

// Middleware
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// OAuth2 Login Route
app.get('/oauth2/login', (req, res) => {
    const authUrl = oauth.generateAuthUrl({
        clientId: CLIENT_ID,
        scope: ['identify', 'guilds'],
        redirectUri: REDIRECT_URI,
    });
    res.redirect(authUrl); // Redirect to Discord's OAuth2 verification page
});

// OAuth2 Callback Route
app.get('/api/auth/discord/redirect', async (req, res) => {
    const { code } = req.query;
    if (code) {
        try {
            // Step 1: Exchange the code for an access token
            const formData = new url.URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code.toString(),
                redirect_uri: REDIRECT_URI,
            });

            const output = await axios.post('https://discord.com/api/oauth2/token', formData.toString(), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
            });

            if (output.data) {
                const access = output.data.access_token;

                // Step 2: Fetch user info
                const userinfo = await axios.get('https://discord.com/api/v10/users/@me', {
                    headers: {
                        Authorization: `Bearer ${access}`,
                    },
                });

                // Step 3: Get user roles from the guild
                const userRoles = await getUserRoles(userinfo.data.id);

                // Check if the user has admin role
                const isAdmin = userRoles.some(role => ADMIN_ROLE_IDS.includes(role));

                // Step 4: Set up user session
                sessions[userinfo.data.id] = {
                    username: userinfo.data.username,
                    discriminator: userinfo.data.discriminator,
                    admin: isAdmin,
                    avatarUrl: `https://cdn.discordapp.com/avatars/${userinfo.data.id}/${userinfo.data.avatar}.png`
                };

                // Step 5: Redirect to Dashboard
                res.cookie('user_id', userinfo.data.id, { httpOnly: true });
                res.redirect('/dashboard');
            } else {
                res.status(400).json({ error: 'Failed to get access token' });
            }
        } catch (error) {
            console.error('Error during the OAuth flow:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    } else {
        res.status(400).json({ error: 'No code provided' });
    }
});

// Get user roles from the guild
async function getUserRoles(userId) {
    const headers = { Authorization: `Bot ${process.env.BOT_TOKEN}` };
    const response = await axios.get(`${DISCORD_API_BASE}/guilds/${GUILD_ID}/members/${userId}`, { headers });
    return response.data.roles || [];
}

// Dashboard Route
app.get('/dashboard', (req, res) => {
    const userId = req.cookies.user_id;
    if (!userId || !sessions[userId]) {
        return res.redirect('/login'); // If no valid session, redirect to login
    }

    const userData = sessions[userId];
    const commands = userData.admin ? getAdminCommands() : getUserCommands();
    res.render('dashboard', { user: userData, commands });
});

// Fetch current raid status
app.get('/api/current-raid', (req, res) => {
    const raidStatus = getCurrentRaid();
    res.json(raidStatus);
});

// Get current active raid based on the time
function getCurrentRaid() {
    const currentMinute = new Date().getMinutes();
    const raidTimes = {
        dedu_island: { start: 15, end: 29 },
        snow_island: { start: 30, end: 44 },
        jungle_island: { start: 0, end: 14 },
    };

    const activeRaids = [];
    for (const raid in raidTimes) {
        if (currentMinute >= raidTimes[raid].start && currentMinute <= raidTimes[raid].end) {
            activeRaids.push({ raid, status: 'In Progress' });
        }
    }

    return activeRaids.length > 0 ? activeRaids : [{ raid: 'jungle_island', status: 'Not started' }];
}

// Admin commands
function getAdminCommands() {
    return {
        economy: [
            { name: '/balance', description: 'Check your account balance' },
            { name: '/daily', description: 'Claim your daily reward' },
            { name: '/leaderboard', description: 'See the top 10 users' },
        ],
        gambling: [
            { name: '/slots', description: 'Play slots and win!' },
            { name: '/coinflip', description: 'Flip a coin' },
        ],
        grind: [
            { name: '!key', description: 'Ping the Key Farm role' },
            { name: '!desert', description: 'Ping the Desert role' },
        ],
    };
}

// User commands
function getUserCommands() {
    return {
        economy: [
            { name: '/balance', description: 'Check your account balance' },
            { name: '/daily', description: 'Claim your daily reward' },
        ],
        gambling: [
            { name: '/slots', description: 'Play slots and win!' },
        ],
        grind: [
            { name: '!key', description: 'Ping the Key Farm role' },
        ],
    };
}

// Logout Route
app.get('/logout', (req, res) => {
    const userId = req.cookies.user_id;
    if (userId) {
        delete sessions[userId];
    }
    res.clearCookie('user_id');
    res.redirect('/login');
});

// Start the server
app.listen(8000, () => {
    console.log('Server running on http://localhost:8000');
});
