# Project Context: CCAvenue Integration using Render Backend

## Objective

Integrate the CCAvenue payment gateway into a website frontend that does not support direct server-side payment integrations (such as Wix Studio or a static website hosted on Vercel).

The solution should use a separate Node.js backend hosted on Render to securely communicate with CCAvenue.

---

## Architecture

Frontend Website

* Can be built using Wix Studio, HTML/CSS/JS, React, Next.js, or hosted on Vercel.
* The frontend must never contain CCAvenue credentials.
* The frontend only initiates a payment request and redirects the user to the backend.

Backend

* Built using Node.js and Express.
* Hosted on Render.
* Responsible for:

  * Creating payment requests.
  * Encrypting request parameters using CCAvenue requirements.
  * Redirecting the user to CCAvenue's payment page.
  * Receiving payment responses from CCAvenue.
  * Decrypting and validating responses.
  * Updating payment status.
  * Redirecting the user back to the frontend success or failure page.

CCAvenue

* Handles payment processing.
* Sends encrypted responses back to backend endpoints.

---

## Environment Variables

The backend should store all credentials securely using Render environment variables.

Required variables:

CCAVENUE_MERCHANT_ID
CCAVENUE_WORKING_KEY
CCAVENUE_ACCESS_CODE
FRONTEND_SUCCESS_URL
FRONTEND_FAILURE_URL

These values must never be exposed to the frontend.

---

## Expected Flow

1. User clicks "Pay Now" on the frontend website.
2. Frontend sends payment information to the Render backend.
3. Backend creates an order and encrypts request data.
4. Backend redirects the user to CCAvenue payment page.
5. User completes payment on CCAvenue.
6. CCAvenue sends encrypted payment response to backend redirect endpoint.
7. Backend decrypts and validates the response.
8. Backend redirects the user to the frontend success or failure page.
9. Optionally, backend stores transaction details in a database.

---

## Example Endpoints

GET /
Health check endpoint.

POST /create-payment
Creates payment request and redirects to CCAvenue.

POST /payment-response
Receives encrypted response from CCAvenue and validates payment.

POST /payment-cancel
Handles payment cancellation.

GET /payment-status/:orderId
Returns payment status for frontend.

---

## Recommended Tech Stack

Backend:

* Node.js
* Express.js

Hosting:

* Render

Frontend:

* Wix Studio or Vercel-hosted application

Optional Database:

* Supabase
* PostgreSQL
* MongoDB

---

## Security Requirements

* Never expose Merchant ID, Working Key, or Access Code in frontend code.
* Validate every payment response received from CCAvenue.
* Do not trust frontend redirects as proof of payment.
* Use environment variables for all sensitive data.
* Verify transaction status before marking an order as paid.

---

## Goal

Provide a simple and maintainable architecture where:

* The frontend focuses only on UI and user interaction.
* The Render backend handles all payment logic.
* CCAvenue credentials remain secure.
* The system works regardless of whether the frontend is hosted on Wix Studio, Vercel, or another platform.
