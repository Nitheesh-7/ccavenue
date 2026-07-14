require("dotenv").config();


const express = require("express");
const crypto = require("crypto");
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const MERCHANT_ID = process.env.MERCHANT_ID;
const ACCESS_CODE = process.env.ACCESS_CODE;
const WORKING_KEY = process.env.WORKING_KEY.trim();

// 🔐 Encrypt function
function encrypt(text, workingKey) {
  const key = crypto.createHash("md5").update(workingKey).digest(); // ✅ buffer (NOT hex)

  const iv = Buffer.alloc(16, 0);

  const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  return encrypted;
}

// 🔓 Decrypt function
function decrypt(encText, workingKey) {
  const key = crypto.createHash("md5").update(workingKey).digest();

  const iv = Buffer.alloc(16, 0);

  const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);

  let decrypted = decipher.update(encText, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}


// 🚀 Initiate Payment
app.get("/pay", (req, res) => {
  const order_id = "ORD" + Date.now();
  const amount = req.query.amount || "100"; // Read from query param or fallback to 100

  const querystring = require("querystring");

  const data = querystring.stringify({
    merchant_id: MERCHANT_ID,
    order_id: order_id,
    currency: "INR",
    amount: amount,
    redirect_url: `${process.env.BASE_URL}/response`,
    cancel_url: `${process.env.BASE_URL}/response`,
    language: "EN"
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

// 🔁 Payment Response
app.post("/response", (req, res) => {
  const encResp = req.body.encResp;

  const decrypted = decrypt(encResp, WORKING_KEY);

  console.log("CCAvenue Response:", decrypted);

  if (decrypted.includes("order_status=Success")) {
    return res.redirect(process.env.SUCCESS_URL);
  } else {
    return res.redirect(process.env.FAIL_URL);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));