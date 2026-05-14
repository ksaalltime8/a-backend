import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

/* =========================
   FIX __dirname (important in ES modules)
========================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =========================
   APP SETUP
========================= */
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

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
const Review = mongoose.model("Review", {
  user: String,    // who left the review (email)
  text: String,    // review text
  rating: { type: Number, default: 5 } // rating stars
}, { timestamps: true });

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
import axios from "axios";

app.post("/contact", async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.json({ success: false, message: "All fields are required" });
  }

  try {
    // Discord webhook payload
    const webhookURL = "https://discord.com/api/webhooks/1503710771887214662/jKVpoTzMpvmiCIkeP48ustF4rrg2GXgfmHseNpSHDrLm9KkwMl6YpsgN2aFwdRgQ2xKJ"; 

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

import Review from "./Review.js";


/* =========================
   DISCORD QUEUE SYSTEM
   Avoid 429 rate limits
========================= */
const discordQueue = [];
let isSendingDiscord = false;

async function processDiscordQueue() {
  if (isSendingDiscord || !discordQueue.length) return;

  isSendingDiscord = true;

  while (discordQueue.length) {
    const review = discordQueue.shift();
    try {
      await axios.post(process.env.DISCORD_REVIEW_WEBHOOK, {
        content: "🔥 New Review Received",
        embeds: [
          {
            title: "New Client Review",
            color: 16711680,
            fields: [
              { name: "User", value: review.user || "Anonymous", inline: true },
              { name: "Rating", value: "⭐".repeat(review.rating || 5), inline: true },
              { name: "Review", value: review.text }
            ],
            timestamp: new Date()
          }
        ]
      });
      console.log(`✅ Sent review from ${review.user} to Discord`);
    } catch (err) {
      console.log("❌ Discord error:", err.message);
      // Push back to queue if needed
      discordQueue.push(review);
    }

    // wait 1 second between requests to respect Discord limits
    await new Promise(r => setTimeout(r, 1000));
  }

  isSendingDiscord = false;
}

/* =========================
   CREATE REVIEW ROUTE (ONLY BUYERS)
========================= */
app.post("/reviews", async (req, res) => {
  try {
    const { user, text, rating } = req.body;

    if (!user || !text) {
      return res.status(400).json({ success: false, message: "Missing data" });
    }

    // 🔐 OPTIONAL: Check if user has orders before allowing review
    // const orders = await Order.find({ email: user });
    // if (!orders.length) return res.status(403).json({ success: false, message: "Buy a plan first" });

    // Save review to database
    const review = new Review({ user, text, rating: rating || 5 });
    await review.save();

    // Queue the review for Discord
    discordQueue.push(review);
    processDiscordQueue(); // start sending if not already running

    res.json({ success: true, review });

  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
});

/* =========================
   GET REVIEWS
========================= */
app.get("/reviews", async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    console.log(err);
    res.status(500).json([]);
  }
});
