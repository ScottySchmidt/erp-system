document.addEventListener('DOMContentLoaded', async function() {

    await checkAuth();

    document.getElementById('invoiceDate').valueAsDate = new Date();
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    document.getElementById('dueDate').valueAsDate = nextMonth;

    lineItems = JSON.parse(localStorage.getItem('currentLineItems') || '[]');

    if (lineItems.length === 0) {
        addRow();
    } else {
        renderLineItems();
    }

    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    await initSupabase();
    await loadCustomers();

    updateTotals();
});

let lineItems = [];
let supabase = null;
let currentUser = null;

async function checkAuth() {
    const user = sessionStorage.getItem('user');
    if (!user) {
        window.location.href = 'login.html';
        throw new Error('Not authenticated');
    }
    console.log('Invoice auth OK');
}

function logout() {
    sessionStorage.clear();
    localStorage.removeItem('currentLineItems');
    window.location.href = 'login.html';
}

async function initSupabase() {
    try {
        const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js@2');
        supabase = createClient(
            'https://uasshkfuiyslfhaaddrb.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhc3Noa2Z1aXlzbGZoYWFkZHJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDc1MDIsImV4cCI6MjA4NjkyMzUwMn0.8W6xIYwIz1U2_BlNNWIG200qAF4pjX97j6Yi-4njYh4'
        );
        const { data: { session } } = await supabase.auth.getSession();
        currentUser = session?.user;
    } catch (e) {
        console.warn('Supabase unavailable - LocalStorage only');
    }
}

async function loadCustomers() {
    const select = document.getElementById('customerSelect');

    try {
        if (supabase && currentUser) {
            const { data } = await supabase.from('vendor').select('vendor_id, vendor_name');
            if (data?.length) {
                select.innerHTML = '<option value="">Select Customer</option>' +
                    data.map(c => `<option value="${c.vendor_name}" data-id="${c.vendor_id}">${c.vendor_name}</option>`).join('');
                return;
            }
        }
    } catch (e) {}

    const customers = JSON.parse(localStorage.getItem('erp_customers') || '[]');
    select.innerHTML = '<option value="">Select Customer</option>' +
        customers.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
}

function addRow() {
    lineItems.push({
        id: Date.now(),
        description: '',
        quantity: 1,
        price: 0,
        tax_rate: 0
    });
    renderLineItems();
    updateTotals();
    saveDraft();
}

window.updateLineItem = function(index, field, value) {
    lineItems[index][field] = parseFloat(value) || value || 0;
    renderLineItems();
    updateTotals();
    saveDraft();
};

window.deleteRow = function(index) {
    lineItems.splice(index, 1);
    renderLineItems();
    updateTotals();
    saveDraft();
};

function renderLineItems() {
    const tbody = document.getElementById('lineItemsBody');
    tbody.innerHTML = lineItems.map((item, index) => `
        <tr data-index="${index}">
            <td><input type="text" value="${item.description}"
                       onchange="updateLineItem(${index}, 'description', this.value)"
                       placeholder="Item description" class="item-input"></td>
            <td><input type="number" value="${item.quantity}" min="0" step="any"
                       onchange="updateLineItem(${index}, 'quantity', this.value)"
                       class="item-input qty-input"></td>
            <td><input type="number" value="${item.price}" min="0" step="0.01"
                       onchange="updateLineItem(${index}, 'price', this.value)"
                       class="item-input price-input"></td>
            <td><input type="number" value="${item.tax_rate}" min="0" max="100" step="0.1"
                       onchange="updateLineItem(${index}, 'tax_rate', this.value)"
                       class="item-input tax-input"></td>
            <td class="total-col font-bold text-green-600">
                $${calculateLineTotal(index).toFixed(2)}
            </td>
            <td><button class="delete-btn" onclick="deleteRow(${index})">×</button></td>
        </tr>
    `).join('') || '<tr><td colspan="6" class="text-center py-8 text-gray-500">No items - click + Add Line Item</td></tr>';
}

function calculateLineTotal(index) {
    const item = lineItems[index];
    const subtotal = (item.quantity || 0) * (item.price || 0);
    const tax = subtotal * ((item.tax_rate || 0) / 100);
    return subtotal + tax;
}

function updateTotals() {
    const subtotal = lineItems.reduce((sum, item) =>
        sum + ((item.quantity || 0) * (item.price || 0)), 0);

    const tax = lineItems.reduce((sum, item) =>
        sum + ((item.quantity || 0) * (item.price || 0) * (item.tax_rate || 0) / 100), 0);

    const total = subtotal + tax;

    document.getElementById('subtotalDisplay').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('taxDisplay').textContent = `$${tax.toFixed(2)}`;
    document.getElementById('totalDisplay').textContent = `$${total.toFixed(2)}`;

    console.log('Totals:', { subtotal, tax, total });
}

function saveDraft() {
    localStorage.setItem('currentLineItems', JSON.stringify(lineItems));
}

window.generateInvoice = async function() {
    if (lineItems.length === 0) return alert('Add line items first!');

    updateTotals();

    const invoiceData = {
        invoice_number: document.querySelector('input[readonly]').value || `INV-${Date.now()}`,
        date: document.getElementById('invoiceDate').value,
        due_date: document.getElementById('dueDate').value,
        customer: document.getElementById('customerSelect').value || 'Customer',
        subtotal: parseFloat(document.getElementById('subtotalDisplay').textContent.replace('$', '')),
        tax: parseFloat(document.getElementById('taxDisplay').textContent.replace('$', '')),
        total: parseFloat(document.getElementById('totalDisplay').textContent.replace('$', '')),
        line_items: lineItems,
        status: 'sent'
    };

    if (supabase && currentUser) {
        try {
            const { data } = await supabase.from('invoices').insert([invoiceData]).select().single();
            console.log('Cloud saved:', data.id);
            await generatePDF(data);
        } catch (e) {
            console.error('Cloud save failed:', e);
        }
    }

    const invoices = JSON.parse(localStorage.getItem('erp_invoices') || '[]');
    invoices.push(invoiceData);
    localStorage.setItem('erp_invoices', JSON.stringify(invoices));

    alert('Invoice generated & saved!');

    lineItems = [];
    renderLineItems();
    addRow();
};

async function generatePDF(invoice) {
    const { jsPDF } = await import('https://cdn.skypack.dev/jspdf');
    const doc = new jsPDF();

    doc.setFontSize(24);
    doc.text('INVOICE', 105, 30, { align: 'center' });
    doc.setFontSize(14);
    doc.text(invoice.invoice_number, 105, 50, { align: 'center' });

    doc.setFontSize(12);
    doc.text(`Customer: ${invoice.customer}`, 20, 80);
    doc.text(`Date: ${new Date(invoice.date).toLocaleDateString()}`, 20, 95);
    doc.text(`Due: ${new Date(invoice.due_date).toLocaleDateString()}`, 20, 110);

    let y = 140;
    doc.setFillColor(240, 240, 240);
    doc.rect(20, y-5, 170, 10, 'F');
    doc.text('Description', 25, y);
    doc.text('Qty', 80, y);
    doc.text('Price', 105, y);
    doc.text('Total', 150, y);

    invoice.line_items.forEach(item => {
        y += 12;
        doc.text(item.description.substring(0, 30), 25, y);
        doc.text(item.quantity.toString(), 80, y);
        doc.text(`$${item.price.toFixed(2)}`, 105, y);
        doc.text(`$${(item.quantity * item.price).toFixed(2)}`, 150, y);
    });

    y += 20;
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(`TOTAL: $${invoice.total.toFixed(2)}`, 20, y);

    doc.save(`${invoice.invoice_number}.pdf`);
}

console.log('Invoice generator loaded');
