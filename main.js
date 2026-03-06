require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const createError = require("http-errors");
const port = process.env.PORT || 3001;
const {
  jwt: { AccessToken },
} = require("twilio");
const VoiceGrant = AccessToken.VoiceGrant;
const { createClient } = require("@supabase/supabase-js");
const checkPhoneNumber = require('./utils/checkValid.js')
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const url = "https://hydrophyllaceous-nonmedical-adell.ngrok-free.dev";
const app = express();
app.use(cors());
// parse application/x-www-form-urlencoded
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json());

app.use(express.json());
// app.post("/request-call", async (req, res) => {
//   const user = await getUser(req.user.id);

//   const ratePerMinute = 1000; // VND
//   const minRequired = ratePerMinute * 1; // yêu cầu tối thiểu 1 phút

//   if (user.balance < minRequired) {
//     return res.status(400).json({
//       error: "Not enough balance",
//     });
//   }

//   res.json({ allowed: true });
// });
app.get('/test',(req,res)=>{
  res.send('tseting')
  
})

app.get("/token", (req, res) => {
  const identity = "web-user";

  const token = new AccessToken(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_API_KEY,
    process.env.TWILIO_API_SECRET,
    { identity },
  );

  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: process.env.TWILIO_APP_SID,
    incomingAllow: true,
  });

  token.addGrant(voiceGrant);

  res.json({ token: token.toJwt() });
});
// TwiML endpoint
app.post('/valid-phone',async (req,res,next)=>{
  console.log(req.body);
  const {phoneNumber} = req.body
  const isValid = await checkPhoneNumber(phoneNumber)
  if(!isValid){
    return next(createError(401,'phone is not valid'))

  }
  res.send({isValid:true})
})
app.post("/voice", async (req, res, next) => {
  const to = req.body.To;
  const userId = req.body.userId;
  if(!to || !userId){
    return next(createError(401,'please,fill in userId'))
  }
  const supabase = await createClient(supabaseUrl, supabaseKey);

  const { data: user, error } = await supabase
    .from("user_gmails")
    .select()
    .eq("mail", userId)
    .single();
  if (error) {
    return next(createError(401,'error in request user'))
  }

  const timePerMinute= 10 //cent
  const availableMinute = Math.round(user?.balance / timePerMinute)
  //   const secondsAllowed = Math.floor((user.balance / rate) * 60);
  console.log("second: ", availableMinute);
  if(availableMinute <= 0){
    return next(createError(401,'not please deposit money'))
  }
  const actionUrl = `/dial-status?userId=${userId}&amp;to=${to}`;
  res.type("text/xml");

  res.send(`  
    <Response>
      <Dial callerId="${process.env.TWILIO_PHONE_NUMBER}" timeLimit="${availableMinute}"  action="${actionUrl}">
        ${to}
      </Dial>
    </Response>
  `);
});

async function minusMoney(amount, userId) {
  if (amount > 0) {
    const supabase = await createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from("user_gmails")
      .update({ balance: Math.round(amount) })
      .eq("mail", userId);
    if (error) {
      console.log(error);
    } else {
      console.log(data);
    }
  }
}
app.post("/dial-status", async (req, res,next) => {
  const duration = parseInt(req.body.DialCallDuration || 0);
  const userId = req.query.userId;
  // const to = req.query.to;
  console.log("duration: ", duration);
  const ratePerMinute = 25
  const cost = (duration / 60) * ratePerMinute;

  //get current balance
  const supabase = await createClient(supabaseUrl, supabaseKey);

  const { data: user, error } = await supabase
    .from("user_gmails")
    .select()
    .eq("mail", userId)
    .single();
  if (error) {
    return next(createError(401,error))
  }
  const balance = user?.balance;
  const surplus = balance - cost ;
  await minusMoney(surplus, userId);

  res.sendStatus(200);
});

app.use((err, req, res, next) => {
  res.json({
    status: err.status || 500,
    message: err.message,
  });
});
app.listen(port, () => console.log("Server running"));
