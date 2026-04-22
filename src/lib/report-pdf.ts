function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatCurrency(value: unknown): string {
  const amount = Number(value ?? 0);
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: unknown): string {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  return date.toLocaleDateString();
}

function formatSummaryValue(key: string, value: unknown): string {
  if (key.includes("amount")) {
    return `$${formatCurrency(value)}`;
  }
  return escapeHtml(value);
}

export function openFinancialReportPdf(report: any, title = "Financial Report") {
  const printWindow = window.open("about:blank", "_blank");
  if (!printWindow) {
    return;
  }

  const summaryRows = Object.entries(report?.summary ?? {})
    .map(
      ([key, value]) =>
        `<tr><td>${escapeHtml(key.replaceAll("_", " "))}</td><td>${formatSummaryValue(key, value)}</td></tr>`,
    )
    .join("");

  const invoiceRows = (report?.invoices ?? [])
    .map(
      (invoice: any) => `
        <tr>
          <td>${escapeHtml(invoice.invoice_id)}</td>
          <td>${escapeHtml(invoice.account_name ?? invoice.account_id ?? "—")}</td>
          <td>${escapeHtml(invoice.vendor_name ?? invoice.vendor_id ?? "—")}</td>
          <td>${formatDate(invoice.invoice_date)}</td>
          <td>$${formatCurrency(invoice.amount)}</td>
          <td>${invoice.is_paid ? "Paid" : "Unpaid"}</td>
        </tr>
      `,
    )
    .join("");

  const paymentRows = (report?.payments ?? [])
    .map(
      (payment: any) => `
        <tr>
          <td>${escapeHtml(payment.voucher_number ?? payment.payment_id ?? "—")}</td>
          <td>${formatDate(payment.payment_date)}</td>
          <td>${escapeHtml(payment.pay_type ?? "—")}</td>
          <td>$${formatCurrency(payment.total_amount)}</td>
        </tr>
      `,
    )
    .join("");

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      @page { size: A4; margin: 14mm; }
      body { font-family: Arial, sans-serif; color: #0f172a; }
      h1 { margin: 0 0 8px; font-size: 22px; }
      .meta { margin-bottom: 12px; color: #475569; font-size: 12px; }
      .section { margin-top: 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #cbd5e1; padding: 6px; text-align: left; vertical-align: top; }
      th { background: #f1f5f9; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">Generated: ${formatDate(report?.generated_at)} ${escapeHtml(report?.generated_at ?? "")}</div>

    <div class="section">
      <h2>Summary</h2>
      <table>
        <tbody>${summaryRows || '<tr><td colspan="2">No summary data</td></tr>'}</tbody>
      </table>
    </div>

    <div class="section">
      <h2>Invoices</h2>
      <table>
        <thead>
          <tr><th>ID</th><th>Account</th><th>Vendor</th><th>Date</th><th>Amount</th><th>Status</th></tr>
        </thead>
        <tbody>${invoiceRows || '<tr><td colspan="6">No invoices</td></tr>'}</tbody>
      </table>
    </div>

    <div class="section">
      <h2>Payments</h2>
      <table>
        <thead>
          <tr><th>Voucher</th><th>Date</th><th>Type</th><th>Total</th></tr>
        </thead>
        <tbody>${paymentRows || '<tr><td colspan="4">No payments</td></tr>'}</tbody>
      </table>
    </div>
  </body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}
