var request = require('request');
var options = {
  'method': 'POST',
  'url': 'https://pay.pesapal.com/v3/api/Auth/RequestToken',
  'headers': {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    "consumer_key": "1l1tuJDuq3LCiY5zxMQXIG4OHUyGYGNu",
    "consumer_secret": "kPnnzmKD0TB4aztnvAt0307GWxs="
  })

};
request(options, function (error, response) {
  if (error) throw new Error(error);
  console.log(response.body);
});
