const express = require("express");
const request = require("request");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();
const needle = require("needle");
const cors = require("cors"); // Import the cors package

const app = express();
app.use(express.json());

// Enable CORS for all routes
app.use(cors());

const token = process.env.BEARER_TOKEN;
const endpointUrl = "https://api.twitter.com/2/tweets/search/recent";

// fetch tweets
async function getRequest() {
  const params = {
    query: "from:BamukeJonathan -is:retweet",
    "tweet.fields": "author_id",
  };

  const res = await needle("get", endpointUrl, params, {
    headers: {
      "User-Agent": "v2RecentSearchJS",
      authorization: `Bearer ${token}`,
    },
  });

  if (res.body) {
    return res.body;
  } else {
    throw new Error("Unsuccessful request");
  }
}

// Endpoint to fetch tweets
app.get("/api/tweets", async (req, res) => {
  try {
    const tweets = await getRequest();
    res.json(tweets);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

// Route to serve the HTML form
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

// Route to handle Pesapal API authentication, IPN registration, and order submission
app.post("/submit-order", (req, res) => {
  // Step 1: Fetch the access token
  const optionsAuth = {
    method: "POST",
    url: "https://pay.pesapal.com/v3/api/Auth/RequestToken",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      consumer_key: process.env.CONSUMER_KEY,
      consumer_secret: process.env.CONSUMER_SECRET,
    }),
  };

  request(optionsAuth, (error, response) => {
    if (error) {
      console.error("Error fetching token:", error);
      return res.status(500).json({ error: "Failed to fetch token" });
    }

    try {
      const parsedResponse = JSON.parse(response.body);
      const accessToken = parsedResponse.token;
      console.log("Fetched Token:", accessToken);

      // Step 2: Generate a UUID for the order and set callback URL
      const url = "https://www.leahinitiative.org/ipn";
      const callbackUrl = "https://www.leahinitiative.org/response-page";

      // Step 3: Register the IPN URL
      const optionsIPN = {
        method: "POST",
        url: "https://pay.pesapal.com/v3/api/URLSetup/RegisterIPN",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          url: url,
          ipn_notification_type: "GET",
        }),
      };

      request(optionsIPN, (error, response) => {
        if (error) {
          console.error("Error registering IPN:", error);
          return res.status(500).json({ error: "Failed to register IPN" });
        }

        try {
          const ipnResponse = JSON.parse(response.body);
          console.log("IPN Registered:", ipnResponse);

          // Store the IPN ID from the response
          const ipnId = ipnResponse.ipn_id; // Assuming 'ipn_id' is in the response body
          console.log("IPN ID:", ipnId);

          // Step 4: Submit the order with the IPN ID stored
          const orderData = {
            id: uuidv4(),

            callback_url: callbackUrl,
            notification_id: ipnId, // Store the ipn_id as notification_id
            billing_address: {
              email_address: req.body.email_address,
              phone_number: req.body.phone_number,
              country_code: "UG", // Assume Uganda for this example
              first_name: req.body.first_name || "",
              middle_name: req.body.middle_name || "",
              last_name: req.body.last_name,
              line_1: req.body.line_1 || "",
              line_2: req.body.line_2 || "",
              city: req.body.city || "",
              state: req.body.state || "",
              postal_code: req.body.postal_code || "",
              zip_code: req.body.zip_code || "",
            },
            currency: req.body.currency,
            amount: req.body.amount,
            description: req.body.description,
          };

          const optionsOrder = {
            method: "POST",
            url: "https://pay.pesapal.com/v3/api/Transactions/SubmitOrderRequest",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(orderData),
          };

          request(optionsOrder, (error, response) => {
            if (error) {
              console.error("Error submitting order:", error);
              return res.status(500).json({ error: "Failed to submit order" });
            }

            const orderResponse = JSON.parse(response.body);
            console.log("Order Submitted:", orderResponse);

            // Get the redirect URL from the response (assuming it's in the response body)
            const redirectUrl = orderResponse.redirect_url;

            res.json({
              message: "Order submitted successfully",
              token: accessToken,
              redirect_url: redirectUrl, // Include redirect URL in the response
            });
          });
        } catch (ipnError) {
          console.error("Error parsing IPN response:", ipnError);
          return res
            .status(500)
            .json({ error: "Failed to parse IPN response" });
        }
      });
    } catch (parseError) {
      console.error("Error parsing token response:", parseError);
      return res.status(500).json({ error: "Failed to parse token response" });
    }
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
