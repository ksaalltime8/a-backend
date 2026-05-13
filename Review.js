import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  user: String,
  text: String,
  rating: Number,
  orderId: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("Review", reviewSchema);