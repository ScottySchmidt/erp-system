import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/new-voucher")({
  component: NewVoucherPage,
});

type VoucherFormData = {
  voucherNumber: string;
  vendorName: string;
  account: string;
  amount: string;
  voucherDate: string;
  description: string;
};

function NewVoucherPage() {
  const [formData, setFormData] = useState<VoucherFormData>({
    voucherNumber: "",
    vendorName: "",
    account: "",
    amount: "",
    voucherDate: "",
    description: "",
  });

  const [submitted, setSubmitted] = useState(false);

  const accounts = [
    "Cash",
    "Accounts Payable",
    "Office Supplies",
    "Travel Expense",
    "Utilities Expense",
  ];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.voucherNumber ||
      !formData.vendorName ||
      !formData.account ||
      !formData.amount ||
      !formData.voucherDate
    ) {
      alert("Please fill all required fields.");
      return;
    }

    console.log("Submitted:", formData);
    setSubmitted(true);

    setFormData({
      voucherNumber: "",
      vendorName: "",
      account: "",
      amount: "",
      voucherDate: "",
      description: "",
    });
  };

  return (
    <div
      style={{
        padding: "40px",
        maxWidth: "700px",
        margin: "0 auto",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "32px", marginBottom: "30px" }}>
        Create New Voucher
      </h1>

      {submitted && (
        <div
          style={{
            marginBottom: "20px",
            padding: "12px 16px",
            backgroundColor: "#e6f9ec",
            border: "1px solid #7bd88f",
            color: "#1f7a35",
            borderRadius: "8px",
            fontWeight: "bold",
          }}
        >
          Voucher submitted successfully!
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Voucher Number */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ fontSize: "18px", fontWeight: "bold" }}>
            Voucher Number *
          </label>
          <input
            name="voucherNumber"
            value={formData.voucherNumber}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>

        {/* Vendor */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ fontSize: "18px", fontWeight: "bold" }}>
            Vendor Name *
          </label>
          <input
            name="vendorName"
            value={formData.vendorName}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>

        {/* Account */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ fontSize: "18px", fontWeight: "bold" }}>
            Account *
          </label>
          <select
            name="account"
            value={formData.account}
            onChange={handleChange}
            style={inputStyle}
          >
            <option value="">Select Account</option>
            {accounts.map((acc) => (
              <option key={acc} value={acc}>
                {acc}
              </option>
            ))}
          </select>
        </div>

        {/* Amount */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ fontSize: "18px", fontWeight: "bold" }}>
            Amount *
          </label>
          <input
            name="amount"
            type="number"
            value={formData.amount}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>

        {/* Voucher Date */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ fontSize: "18px", fontWeight: "bold" }}>
            Voucher Date *
          </label>
          <input
            name="voucherDate"
            type="date"
            value={formData.voucherDate}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom: "25px" }}>
          <label style={{ fontSize: "18px", fontWeight: "bold" }}>
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            style={inputStyle}
          />
        </div>

        <button
          type="submit"
          style={{
            padding: "12px 24px",
            fontSize: "16px",
            fontWeight: "bold",
            backgroundColor: "#111827",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Submit
        </button>
      </form>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px",
  marginTop: "5px",
  border: "1px solid #999",
  borderRadius: "6px",
};

export default NewVoucherPage;