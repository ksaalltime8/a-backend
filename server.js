const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();

/* =========================
   MIDDLEWARE
========================= */
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(process.cwd(), "public")));

/* =========================
   MONGODB CONNECTION
========================= */
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ MongoDB Error:", err));

/* =========================
   MODELS
========================= */
const User = mongoose.model("User", {
  email: String,
  password: String,
  role: String // optional
});

const Order = mongoose.model("Order", {
  email: String,
  plan: String,
  status: String,
  date: String
});

/* =========================
   ROUTES
========================= */

// Health check
app.get("/", (req, res) => {
  res.send("🔥 Backend is running correctly");
});

/* ---------- SIGNUP ---------- */
app.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.json({ success: false, message: "User already exists" });
    await User.create({ email, password });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

/* ---------- LOGIN ---------- */
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });
    if (!user) return res.json({ success: false, message: "Invalid login" });
    res.json({ success: true, email: user.email, role: user.role || "user" });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

/* ---------- CREATE ORDER ---------- */
app.post("/order", async (req, res) => {
  try {
    const { email, plan } = req.body;
    await Order.create({ email, plan, status: "Pending", date: new Date().toLocaleString() });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

/* ---------- GET USER ORDERS ---------- */
app.get("/orders/:email", async (req, res) => {
  try {
    const orders = await Order.find({ email: req.params.email });
    res.json(orders);
  } catch (err) {
    res.json([]);
  }
});

/* ---------- GET ALL ORDERS (ADMIN) ---------- */
app.get("/all-orders", async (req, res) => {
  try {
    const orders = await Order.find({});
    res.json(orders);
  } catch (err) {
    res.json([]);
  }
});

/* ---------- UPDATE ORDER ---------- */
app.post("/update", async (req, res) => {
  try {
    const { id, status } = req.body;
    await Order.findByIdAndUpdate(id, { status });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Server running on port", PORT));


/*========================
Discord Contact 
=====================*/

// Make sure to install axios: npm install axios
const axios = require("axios");

app.post("/contact", async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.json({ success: false, message: "All fields are required" });
  }

  try {
    // Discord webhook payload
    const webhookURL = "YOUR_DISCORD_WEBHOOK_URL"; // replace this

    await axios.post(webhookURL, {
      content: `📩 **New Project Message**\n**Name:** ${name}\n**Email:** ${email}\n**Message:** ${message}`
    }, {
      headers: { "Content-Type": "application/json" }
    });

    res.json({ success: true });

  } catch (err) {
    console.error("Discord Webhook Error:", err.response?.data || err.message);
    res.json({ success: false, message: "Failed to send message" });
  }
});
