const express = require('express');
const axios = require('axios');
const app = express();

// Replace these with your actual Discord credentials
const clientID = '1404595445275164804';
const clientSecret = 'YkBCpYRVpC5zktTrmvlQDeMcg1zpKtdD';
const redirectUri = 'https://blake0v2.github.io/TheArchAngels/dashboard.html';  // Update with your redirect URI
const scope = 'identify';

// Endpoint to start the OAuth flow
app.get('/login', (req, res) => {
  const authUrl = `https://discord.com/oauth2/authorize?client_id=${clientID}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
  res.redirect(authUrl); // Redirect to Discord login page
});

// OAuth callback handler
app.get('/oauth/callback', async (req, res) => {
  const { code } = req.query;

  try {
    // Exchange authorization code for an access token
    const response = await axios.post(
      'https://discord.com/oauth2/token',
      new URLSearchParams({
        client_id: clientID,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      })
    );
    const { access_token } = response.data;

    // Fetch user information
    const userResponse = await axios.get('https://discord.com/api/v9/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    const user = userResponse.data;

    // Redirect to the main website with user data in the query parameters
    res.redirect(`https://blake0v2.github.io/TheArchAngels/dashboard.html?username=${user.username}&avatar=${user.avatar}&userId=${user.id}`);
  } catch (error) {
    res.status(500).send('OAuth2 authentication failed');
  }
});

// Start the server
app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
