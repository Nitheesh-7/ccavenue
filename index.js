require("dotenv").config();

const express = require("express");
const crypto = require("crypto");
const querystring = require("querystring");
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const MERCHANT_ID = process.env.MERCHANT_ID;
const ACCESS_CODE = process.env.ACCESS_CODE;
const WORKING_KEY = (process.env.WORKING_KEY || "").trim();

// Your Render backend's own base URL — must be whitelisted in CCAvenue.
const BASE_URL = process.env.BASE_URL || "https://ccavenue-1.onrender.com";

// Frontend (Wix) pages to send the user back to at the very end.
const SUCCESS_URL = process.env.SUCCESS_URL;
const FAIL_URL = process.env.FAIL_URL;

// ─── SCREEN-ONLY TEST MODE ──────────────────────────────────────────────
// Set TEST_MODE=true in Render env vars ONLY to check the CCAvenue payment
// screen loads before the Render URL is whitelisted.
// In this mode redirect/cancel point at the already-registered live domain,
// so CCAvenue accepts the request and shows the screen.
// ⚠️ Confirm the screen appears, then CLOSE THE TAB. Do NOT enter card
// details — a completed payment would create a real order on the live site.
// Set TEST_MODE=false (or remove it) for normal operation.
const TEST_MODE = process.env.TEST_MODE === "true";
const REGISTERED_LIVE_URL = "https://www.airguns.co.in";

// CCAvenue's required fixed 16-byte IV.
const IV = Buffer.from([
  0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
  0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
]);

function encrypt(text, workingKey) {
  const key = crypto.createHash("md5").update(workingKey).digest();
  const cipher = crypto.createCipheriv("aes-128-cbc", key, IV);
  return cipher.update(text, "utf8", "hex") + cipher.final("hex");
}

function decrypt(encText, workingKey) {
  const key = crypto.createHash("md5").update(workingKey).digest();
  const decipher = crypto.createDecipheriv("aes-128-cbc", key, IV);
  return decipher.update(encText, "hex", "utf8") + decipher.final("utf8");
}

// Health check
app.get("/", (req, res) => res.send("CCAvenue backend running"));

// 🚀 Initiate Payment — Wix links to /pay?amount=X
app.get("/pay", (req, res) => {
  const order_id = "ORD" + Date.now();
  const amount = req.query.amount || "1";

  // In TEST_MODE, point at the already-registered live URL so the screen loads.
  // Otherwise point at our own /response and /cancel routes (requires the
  // Render URL to be added to CCAvenue's Web Store URL list).
  const redirect_url = TEST_MODE ? REGISTERED_LIVE_URL : `${BASE_URL}/response`;
  const cancel_url = TEST_MODE ? REGISTERED_LIVE_URL : `${BASE_URL}/cancel`;

  const data = querystring.stringify({
    merchant_id: MERCHANT_ID,
    order_id: order_id,
    currency: "INR",
    amount: amount,
    redirect_url: redirect_url,
    cancel_url: cancel_url,
    language: "EN",
  });

  const encRequest = encrypt(data, WORKING_KEY);

  res.send(`
    <html>
      <body onload="document.forms[0].submit()">
        <form method="post" action="https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction">
          <input type="hidden" name="encRequest" value="${encRequest}" />
          <input type="hidden" name="access_code" value="${ACCESS_CODE}" />
        </form>
      </body>
    </html>
  `);
});

// Parse CCAvenue's decrypted "a=b&c=d" response safely.
function parseResponse(decrypted) {
  return querystring.parse(decrypted);
}

// 🔁 Payment Response — CCAvenue POSTs here after payment
app.post("/response", (req, res) => {
  try {
    const encResp = req.body.encResp;
    if (!encResp) return res.redirect(FAIL_URL);

    const decrypted = decrypt(encResp, WORKING_KEY);
    const params = parseResponse(decrypted);

    console.log("CCAvenue Response:", params.order_id, params.order_status);

    // Trust only the decrypted status — never the frontend.
    if (params.order_status === "Success") {
      return res.redirect(SUCCESS_URL);
    }
    return res.redirect(FAIL_URL);
  } catch (err) {
    console.error("Response decrypt error:", err.message);
    return res.redirect(FAIL_URL);
  }
});

// 🚫 Cancel — CCAvenue POSTs here if user cancels
app.post("/cancel", (req, res) => {
  try {
    const encResp = req.body.encResp;
    if (encResp) {
      const params = parseResponse(decrypt(encResp, WORKING_KEY));
      console.log("Cancelled:", params.order_id, params.order_status);
    }
  } catch (err) {
    console.error("Cancel decrypt error:", err.message);
  }
  return res.redirect(FAIL_URL);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));