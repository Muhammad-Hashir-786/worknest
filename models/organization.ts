import mongoose from "mongoose";
import { COMPANY_SIZES, INDUSTRIES } from "../lib/constants/roles";

const OrganizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    logo: {
      type: String,
      default:
        "https://res.cloudinary.com/dxjv0gq1f/image/upload/v1690919825/avatars/default-avatar_owzq3r.png",
    },
    industry: { type: String, required: true, enum: INDUSTRIES },
    companySize: { type: String, required: true, enum: COMPANY_SIZES },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Organization ||
  mongoose.model("Organization", OrganizationSchema);
