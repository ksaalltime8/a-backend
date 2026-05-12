const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fetch = require("node-fetch"); // Make sure node-fetch is in package.json

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
  role: String // optional: "admin" for admin users
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

/* ---------- UPDATE ORDER + DISCORD ---------- */
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;

app.post("/update", async (req, res) => {
  try {
    const { id, status } = req.body;
    const order = await Order.findByIdAndUpdate(id, { status }, { new: true });
    res.json({ success: true });

    // Send Discord notification safely
    if (DISCORD_WEBHOOK && order) {
      try {
        await fetch(DISCORD_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: `📦 **Order Updated**
- User: ${order.email}
- Plan: ${order.plan}
- Status: ${order.status}
- Date: ${order.date}`
          })
        });
      } catch (err) {
        console.log("Discord webhook error:", err.message);
      }
    }

  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Server running on port", PORT));
