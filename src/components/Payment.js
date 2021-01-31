import React, { useState, useEffect } from "react";
import { useStateValue } from "../StateProvider";
import CheckoutProduct from "./CheckoutProduct";
import "./Payment.css";
import FlipMove from "react-flip-move";
import { Link, useHistory } from "react-router-dom";
import { useElements, useStripe, CardElement } from "@stripe/react-stripe-js";
import CurrencyFormat from "react-currency-format";
import { getBasketTotal } from "../reducer";
import axios from "../axios";
import { db } from "../firebase";

function Payment() {
  const [{ user, basket }, dispatch] = useStateValue();

  const stripe = useStripe();
  const elements = useElements();
  const history = useHistory();

  const [error, setError] = useState(null);
  const [disabled, setDisabled] = useState(true);
  const [succeeded, setSucceeded] = useState(false);
  const [processing, setProcessing] = useState("");
  const [clientSecret, setClientSecret] = useState(null);
  const [pMethod, setPMethod] = useState(null);

  useEffect(() => {
    const getClientSecret = async () => {
      const responce = await axios({
        method: "post",
        url: `/payments/create?total=${getBasketTotal(basket) * 100}`,
      });
      setClientSecret(responce.data.clientSecret);
      setPMethod(responce.data.pMethod);
    };
    getClientSecret();
  }, [basket]);

  console.log("THE SECRET IS >>> ", clientSecret);

  const submitHandler = async (e) => {
    //stripe magic
    e.preventDefault();
    setProcessing(true);
    console.log(elements?.getElement(CardElement));
    const payload = await stripe
      .confirmCardPayment(clientSecret, {
        payment_method: pMethod,
      })
      .then((result) => {
        //paymentIntent = payment confirmation
        if (result) {
          let intent = result.error.payment_intent;
          db.collection("users")
            .doc(user?.uid)
            .collection("orders")
            .doc(intent.id)
            .set({
              basket: basket,
              amount: intent.amount,
              created: intent.created,
            });
          console.log(result.error.payment_intent);
          setSucceeded(true);
          setError(null);
          setProcessing(false);

          dispatch({
            type: "EMPTY_BASKET",
          });

          history.replace("/orders");
        }
      });
  };

  const changeHandler = (e) => {
    //stripe magic
    setDisabled(e.empty);
    setError(e.error ? e.error.message : "");
  };

  return (
    <div className="payment">
      <div className="payment__container">
        <h1>
          Checkout(<Link to="/checkout">{basket?.length} items</Link>)
        </h1>

        <div className="payment__section">
          <div className="payment__title">
            <h3>Delivery Address</h3>
          </div>
          <div className="payment__address">
            <p>{user?.email}</p>
            <p>123 React Lane</p>
            <p>Los Angeles, CA</p>
          </div>
        </div>

        <div className="payment__section">
          <div className="payment__title">
            <h3>Review items and delivery</h3>
          </div>
          <div className="payment__items">
            <FlipMove>
              {basket.map((item) => (
                <div>
                  <CheckoutProduct
                    id={item.id}
                    title={item.title}
                    image={item.image}
                    price={item.price}
                    rating={item.rating}
                  />
                </div>
              ))}
            </FlipMove>
          </div>
        </div>

        <div className="payment__section">
          <div className="payment__title">
            <h3>Payment Method</h3>
          </div>
          <div className="payment__details">
            <form onSubmit={submitHandler}>
              <CardElement onChange={changeHandler} />

              <div className="payment__priceContainer">
                <CurrencyFormat
                  renderText={(value) => (
                    <>
                      <h3>Order Total: {value}</h3>
                    </>
                  )}
                  decimalScale={2}
                  value={getBasketTotal(basket)}
                  displayType={"text"}
                  thousandSeperator={true}
                  prefix={"$"}
                />
                <button
                  disabled={
                    processing || disabled || succeeded || clientSecret === null
                  }
                >
                  <span>{processing ? <p>Processing</p> : "Buy Now"}</span>
                </button>
              </div>
              {error && <div>{error}</div>}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Payment;
