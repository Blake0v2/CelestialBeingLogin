const express = require('express');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const { OAuth2 } = require('discord-oauth2');
const oauth = new OAuth2();
const app = express();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:8000/callback';
const GUILD_ID = process.env.GUILD_ID;
const ADMIN_ROLE_IDS = process.env.ADMIN_ROLE_IDS ? process.env.ADMIN_ROLE_IDS.split(',') : [];
const DISCORD_API_BASE = 'https://discord.com/api/v10';

// In-memory sessions for simplicity
let sessions = {};

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
app.get('/callback', async (req, res) => {
    try {
        const token = await oauth.tokenRequest({
            clientId: CLIENT_ID,
            clientSecret: CLIENT_SECRET,
            code: req.query.code,
            redirectUri: REDIRECT_URI,
        });

        const user = await oauth.getUser(token.access_token);

        // Fetch user data
        const userId = user.id;
        const userRoles = await getUserRoles(userId);

        const isAdmin = userRoles.some(role => ADMIN_ROLE_IDS.includes(role));
        const avatarUrl = `https://cdn.discordapp.com/avatars/${userId}/${user.avatar}.png`;

        // Store user session
        sessions[userId] = {
            username: user.username,
            discriminator: user.discriminator,
            admin: isAdmin,
            avatarUrl: avatarUrl
        };

        // Set cookie and redirect to dashboard
        res.cookie('user_id', userId, { httpOnly: true });
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Error during OAuth2 callback:', error);
        res.status(500).send('Error during OAuth2 callback.');
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

// Run the server
app.listen(8000, () => {
    console.log('Server running on http://localhost:8000');
});

