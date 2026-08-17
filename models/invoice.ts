import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    number: { type: String, required: true },
    status: { type: String, enum: ["draft", "sent", "paid", "overdue", "void"], default: "draft" },
    issueDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    lineItems: [{ description: { type: String, required: true }, quantity: { type: Number, required: true }, unitPrice: { type: Number, required: true } }],
    notes: { type: String, default: "" },
    total: { type: Number, required: true },
  },
  { timestamps: true }
);
invoiceSchema.index({ organization: 1, number: 1 }, { unique: true });
invoiceSchema.index({ project: 1, status: 1 });
export default mongoose.models.Invoice || mongoose.model("Invoice", invoiceSchema);
