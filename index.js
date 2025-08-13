const express = require('express');
const axios = require('axios');
const app = express();

// Replace these with your actual Discord credentials
const clientID = '1404595445275164804';
const clientSecret = 'YkBCpYRVpC5zktTrmvlQDeMcg1zpKtdD';
const redirectUri = 'https://blake0v2.github.io/TheArchAngels/dashboard.html';
const scope = 'identify';

app.get('/oauth/callback', async (req, res) => {
  const { code } = req.query;

  // Exchange authorization code for an access token
  try {
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

    // Send user data (username, avatar) to frontend by redirecting to dashboard
    const dashboardUrl = `https://blake0v2.github.io/TheArchAngels/dashboard.html?username=${user.username}&avatar=${user.avatar}&userId=${user.id}`;
    res.redirect(dashboardUrl);
  } catch (error) {
    res.status(500).send('OAuth2 authentication failed');
  }
});

// Start the server
app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
