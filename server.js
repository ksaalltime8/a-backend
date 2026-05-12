const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// CONNECT MONGODB
mongoose.connect("mongodb+srv://iik27:eg28zgEY4xgUf3My@cluster0.noihqk2.mongodb.net/?appName=Cluster0");

// USER MODEL
const User = mongoose.model("User", {
  email: String,
  password: String
});

// SIGNUP
app.post("/signup", async (req,res) => {
  const { email, password } = req.body;

  const exists = await User.findOne({ email });

  if(exists){
    return res.json({ success:false, message:"User exists" });
  }

  await User.create({ email, password });

  res.json({ success:true });
});

// LOGIN
app.post("/login", async (req,res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email, password });

  if(user){
    res.json({ success:true });
  } else {
    res.json({ success:false });
  }
});

app.listen(3000);