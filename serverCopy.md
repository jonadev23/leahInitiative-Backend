const express = require('express');
const request = require('request');
require('dotenv').config();

const app = express();
let accessToken = null; // Store the token in memory

// Function to fetch the access token
const fetchAccessToken = (callback) => {
  const options = {
    method: 'POST',
    url: 'https://pay.pesapal.com/v3/api/Auth/RequestToken',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      consumer_key: process.env.CONSUMER_KEY,
      consumer_secret: process.env.CONSUMER_SECRET,
    }),
  };

  request(options, (error, response) => {
    if (error) {
      console.error('Error fetching token:', error);
      callback(error);
      return;
    }

    try {
      const parsedResponse = JSON.parse(response.body);
      console.log('Fetched Token:', parsedResponse.token);
      accessToken = parsedResponse.token; // Save token for future use
      callback(null, parsedResponse.token);
    } catch (parseError) {
      console.error('Error parsing token response:', parseError.message);
      callback(new Error('Failed to parse token response'));
    }
  });
};

// Function to register IPN
const registerIPN = (token, callback) => {
  const ipnOptions = {
    method: 'POST',
    url: 'https://pay.pesapal.com/v3/api/URLSetup/RegisterIPN',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      url: 'https://www.leahinitiative.org/ipn',
      ipn_notification_type: 'GET',
    }),
  };

  request(ipnOptions, (error, response) => {
    if (error) {
      console.error('Error registering IPN:', error);
      callback(error);
      return;
    }

    try {
      const parsedBody = JSON.parse(response.body);
      console.log('IPN Registered:', parsedBody);
      callback(null, parsedBody);
    } catch (parseError) {
      console.error('Error parsing IPN response:', parseError.message);
      callback(new Error('Failed to parse IPN response'));
    }
  });
};

// Function to get the IPN list
const getIpnList = (token, callback) => {
  const options = {
    method: 'GET',
    url: 'https://pay.pesapal.com/v3/api/URLSetup/GetIpnList',
    headers: {
      Authorization: `Bearer ${token}`, // Use the provided access token
    },
  };

  request(options, (error, response) => {
    if (error) {
      console.error('Error fetching IPN list:', error);
      callback(error);
      return;
    }

    try {
      const parsedResponse = JSON.parse(response.body);
      console.log('Fetched IPN List:', parsedResponse);
      callback(null, parsedResponse);
    } catch (parseError) {
      console.error('Error parsing IPN list response:', parseError.message);
      callback(new Error('Failed to parse IPN list response'));
    }
  });
};



// Route to serve the HTML form
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});


// Route to handle Pesapal API authentication, IPN registration, and fetching IPN list
app.post('/auth', (req, res) => {
  // Step 1: Fetch access token
  fetchAccessToken((err, token) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Step 2: Register IPN after token is fetched
    registerIPN(token, (err, ipnResponse) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Step 3: Fetch the IPN list after registration
      getIpnList(token, (err, ipnList) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.json({
          message: 'Token fetched, IPN registered, and IPN list fetched successfully',
          token,
          ipnResponse,
          ipnList,
        });
        console.log(ipnList.ipn_id);
        
      });
    });
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
