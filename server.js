const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

/* =========================
   SAFE MONGODB CONNECTION
========================= */

mongoose.connect(process.env.MONGO_URL)
.then(() => console.log("✅ MongoDB Connected"))
.catch((err) => console.log("❌ MongoDB Error:", err));

/* =========================
   MODELS
========================= */

const User = mongoose.model("User", {
  email: String,
  password: String
});

const Order = mongoose.model("Order", {
  email: String,
  plan: String,
  status: String,
  date: String
});

/* =========================
   HEALTH CHECK ROUTE
========================= */

app.get("/", (req, res) => {
  res.send("🔥 Backend is running correctly");
});

/* =========================
   SIGNUP
========================= */

app.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    const exists = await User.findOne({ email });

    if (exists) {
      return res.json({ success: false, message: "User already exists" });
    }

    await User.create({ email, password });

    res.json({ success: true });

  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

/* =========================
   LOGIN
========================= */

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email, password });

    if (user) {
      res.json({ success: true, email });
    } else {
      res.json({ success: false, message: "Invalid login" });
    }

  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

/* =========================
   CREATE ORDER
========================= */

app.post("/order", async (req, res) => {
  try {
    const { email, plan } = req.body;

    await Order.create({
      email,
      plan,
      status: "Pending",
      date: new Date().toLocaleString()
    });

    res.json({ success: true });

  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

/* =========================
   GET USER ORDERS
========================= */

app.get("/orders/:email", async (req, res) => {
  try {
    const orders = await Order.find({ email: req.params.email });
    res.json(orders);

  } catch (err) {
    res.json([]);
  }
});

/* =========================
   UPDATE ORDER STATUS (ADMIN)
========================= */

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
   START SERVER (RENDER SAFE)
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});