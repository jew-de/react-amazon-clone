const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const { Card } = require("@material-ui/core");
const stripe = require("stripe")(
  "sk_test_51IDuK2CVnWiqnU8TE7ybjYeiEfzKeWoSjUd4yaLTXkYLSdSoznQFko0WNMSU9qEeRMNQ2olGkIN5K4RCd10jVAPK00qL6zXScr"
);

// API

// - App config
const app = express();

// - Middlewares
app.use(cors({ origin: true }));
app.use(express.json());

// - API routes
app.get("/", (request, responce) => responce.status(200).send("hello world"));

app.post("/payments/create", async (request, responce) => {
  const total = request.query.total;

  console.log("Payment Request Received >>> ", total);
  const paymentMethod = await stripe.paymentMethods.create({
    type: "card",
    card: {
      number: "4242424242424242",
      exp_month: 1,
      exp_year: 2022,
      cvc: "314",
    },
  });
  const customer = await stripe.customers.create({
    description: "new customer",
    payment_method: paymentMethod.id,
  });
  const paymentIntent = await stripe.paymentIntents.create({
    amount: total,
    currency: "usd",
    customer: customer.id,
    payment_method: paymentMethod.id,
  });
  const intent = await stripe.paymentIntents.confirm(paymentIntent.id);

  // OK - Created
  responce.status(201).send({
    clientSecret: intent.client_secret,
    customer: customer,
    pMethod: paymentMethod.id,
  });
});

// - Listen command
exports.api = functions.https.onRequest(app);

// Example endpoint
// http://localhost:5001/clone-f805e/us-central1/api
