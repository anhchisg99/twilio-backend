require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require('body-parser')
const { jwt: { AccessToken } } = require("twilio");
const VoiceGrant = AccessToken.VoiceGrant;

const app = express();
app.use(cors());
// parse application/x-www-form-urlencoded
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// app.use(bodyParser.urlencoded({ extended: false }))
// // parse application/json
// app.use(bodyParser.json())

app.use(express.json());

app.get("/token", (req, res) => {
  const identity = "web-user";

  const token = new AccessToken(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_API_KEY,
    process.env.TWILIO_API_SECRET,
    { identity }
  );

  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: process.env.TWILIO_APP_SID,
    incomingAllow: true
  });

  token.addGrant(voiceGrant);

  res.json({ token: token.toJwt() });
});

// TwiML endpoint
app.post("/voice", (req, res) => {
  const to = req.body.To || '+84338075758'
    console.log('phone number: ',req.body);
  res.type("text/xml");
  res.send(`
    <Response>
      <Dial callerId="${process.env.TWILIO_PHONE_NUMBER}">
        ${to}
      </Dial>
    </Response>
  `);
});

app.listen(3001, () => console.log("Server running"));