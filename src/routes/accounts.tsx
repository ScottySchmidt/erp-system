import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/accounts")({
  component: AccountsPage,
});

type Account = {
  account_id: number;
  account_description: string;
};

function AccountsPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("");

  const accounts: Account[] = [
    { account_id: 1, account_description: "Cash" },
    { account_id: 2, account_description: "Accounts Payable" },
    { account_id: 3, account_description: "Office Supplies" },
    { account_id: 4, account_description: "Travel Expense" },
    { account_id: 5, account_description: "Utilities Expense" },
    { account_id: 6, account_description: "Payroll Expense" },
  ];

  const filteredAccounts = accounts.filter((acc) =>
    acc.account_description.toLowerCase().includes(search.toLowerCase())
  );

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
        View & Search Accounts
      </h1>

      <input
        type="text"
        placeholder="Search accounts..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%",
          padding: "12px",
          marginBottom: "20px",
          fontSize: "16px",
          border: "1px solid #999",
          borderRadius: "6px",
          boxSizing: "border-box",
        }}
      />

      {selected && (
        <div
          style={{
            marginBottom: "20px",
            padding: "12px 16px",
            backgroundColor: "#e0f2fe",
            border: "1px solid #7dd3fc",
            color: "#075985",
            borderRadius: "8px",
            fontWeight: "bold",
          }}
        >
          Selected Account: {selected}
        </div>
      )}

      <div>
        {filteredAccounts.length > 0 ? (
          filteredAccounts.map((acc) => (
            <div
              key={acc.account_id}
              onClick={() => setSelected(acc.account_description)}
              style={{
                padding: "12px",
                border: "1px solid #ddd",
                borderRadius: "6px",
                marginBottom: "10px",
                backgroundColor:
                  selected === acc.account_description ? "#dbeafe" : "#f9fafb",
                cursor: "pointer",
                fontWeight:
                  selected === acc.account_description ? "bold" : "normal",
                transition: "0.2s",
              }}
            >
              {acc.account_description}
            </div>
          ))
        ) : (
          <p style={{ color: "gray" }}>No accounts found.</p>
        )}
      </div>
    </div>
  );
}

export default AccountsPage;