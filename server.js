import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";

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

// Optional: Website content
const SiteContent = mongoose.model("SiteContent", {
  heroTitle: String,
  heroSubtitle: String,
  bannerURL: String
});

// Pricing plans
const PricingPlan = mongoose.model("PricingPlan", {
  name: String,
  price: Number,
  features: [String]
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

////////admin page/////////

app.get("/admin/users", async (req, res) => {
  try {
    const users = await User.find().sort({ _id: -1 });
    res.json(users);
  } catch (err) {
    console.log(err);
    res.status(500).json([]);
  }
});

// UPDATE user role
app.post("/admin/users/role", async (req, res) => {
  const { email, role } = req.body;
  try {
    await User.updateOne({ email }, { role });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// DELETE user
app.post("/admin/users/delete", async (req, res) => {
  const { email } = req.body;
  try {
    await User.deleteOne({ email });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});
// GET site content
app.get("/admin/content", async (req, res) => {
  try {
    const content = await SiteContent.findOne(); // assuming you have a SiteContent model
    res.json(content);
  } catch(err) {
    res.status(500).json({});
  }
});

// UPDATE site content
app.post("/admin/content", async (req, res) => {
  const { heroTitle, heroSubtitle, bannerURL } = req.body;
  try {
    let content = await SiteContent.findOne();
    if (!content) content = new SiteContent({});
    content.heroTitle = heroTitle;
    content.heroSubtitle = heroSubtitle;
    content.bannerURL = bannerURL;
    await content.save();
    res.json({ success: true, content });
  } catch(err) {
    res.json({ success: false, error: err.message });
  }
});
// GET plans
app.get("/admin/plans", async (req, res) => {
  const plans = await PricingPlan.find().sort({ price: 1 });
  res.json(plans);
});

// ADD plan
app.post("/admin/plans/add", async (req, res) => {
  const { name, price, features } = req.body;
  const plan = new PricingPlan({ name, price, features });
  await plan.save();
  res.json({ success: true, plan });
});

// UPDATE plan
app.post("/admin/plans/update", async (req, res) => {
  const { id, name, price, features } = req.body;
  await PricingPlan.findByIdAndUpdate(id, { name, price, features });
  res.json({ success: true });
});

// DELETE plan
app.post("/admin/plans/delete", async (req, res) => {
  const { id } = req.body;
  await PricingPlan.findByIdAndDelete(id);
  res.json({ success: true });
});
