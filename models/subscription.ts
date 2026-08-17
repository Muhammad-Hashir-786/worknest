import mongoose from "mongoose";
import { SUBSCRIPTION_PLANS, SUBSCRIPTION_STATUS } from "../lib/constants/roles";

const subscriptionSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      unique: true,
      index: true,
    },
    plan: {
      type: String,
      required: true,
      enum: SUBSCRIPTION_PLANS,
      default: "free",
    },
    status: {
      type: String,
      required: true,
      enum: SUBSCRIPTION_STATUS,
      default: "trialing",
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    renewalDate: {
      type: Date,
    },
    providerCustomerId: {
      type: String, // e.g. Stripe customer ID
    },
    providerSubscriptionId: {
      type: String, // e.g. Stripe subscription ID
    },
  },
  { timestamps: true }
);

export default mongoose.models.Subscription ||
  mongoose.model("Subscription", subscriptionSchema);
