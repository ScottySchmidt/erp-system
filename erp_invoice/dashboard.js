document.addEventListener('DOMContentLoaded', async function() {
    await checkAuth();

    await loadDashboardData();

    document.getElementById('logoutBtn').addEventListener('click', logout);
});

let invoices = [];
let customers = [];
let dashboardData = {};

async function checkAuth() {
    const user = sessionStorage.getItem('user');
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    const userData = JSON.parse(user);
    document.getElementById('userName').textContent = userData.email;
}

async function loadDashboardData() {
    try {
        const data = await loadFromSupabase();
        invoices = data.invoices || [];
        customers = data.customers || [];

        renderStats();
        renderCharts();
        renderInvoicesTable();

    } catch (error) {
        console.warn('Using LocalStorage data');
        loadFromLocalStorage();
    }
}

async function loadFromSupabase() {
    const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js@2');
    const supabase = createClient('https://ihdngvgfympjiepwzgqn.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloZG5ndmdmeW1wamllcHd6Z3FuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMjE2NjgsImV4cCI6MjA4ODU5NzY2OH0.xj0GS_BG3J8VWGnGV04z8MS_JsQ9P-wdblQfCSHE4JE');

    const [invoicesRes, customersRes] = await Promise.all([
        supabase.from('invoices').select('*').order('created_at', { ascending: false }),
        supabase.from('customers').select('*')
    ]);

    return {
        invoices: invoicesRes.data || [],
        customers: customersRes.data || []
    };
}

function loadFromLocalStorage() {
    invoices = JSON.parse(localStorage.getItem('erp_invoices') || '[]');
    customers = JSON.parse(localStorage.getItem('erp_customers') || []);

    renderStats();
    renderCharts();
    renderInvoicesTable();
}

function renderStats() {
    const totalInvoices = invoices.length;
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalCustomers = customers.length;
    const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
    const conversionRate = totalInvoices > 0 ? Math.round((paidInvoices / totalInvoices) * 100) : 0;

    document.getElementById('totalInvoices').textContent = totalInvoices;
    document.getElementById('totalRevenue').textContent = `$${totalRevenue.toLocaleString()}`;
    document.getElementById('totalCustomers').textContent = totalCustomers;
    document.getElementById('conversionRate').textContent = `${conversionRate}%`;
}

function renderCharts() {
    const ctx1 = document.getElementById('revenueChart').getContext('2d');
    new Chart(ctx1, {
        type: 'line',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{
                label: 'Revenue',
                data: [1200, 1900, 3000, 5000],
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });


    const ctx2 = document.getElementById('statusChart').getContext('2d');
    const statusData = {
        draft: invoices.filter(i => i.status === 'draft').length,
        sent: invoices.filter(i => i.status === 'sent').length,
        paid: invoices.filter(i => i.status === 'paid').length
    };

    new Chart(ctx2, {
        type: 'doughnut',
        data: {
            labels: ['Draft', 'Sent', 'Paid'],
            datasets: [{
                data: [statusData.draft, statusData.sent, statusData.paid],
                backgroundColor: ['#f59e0b', '#3b82f6', '#10b981']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderInvoicesTable() {
    const tbody = document.getElementById('invoicesTable');
    const recentInvoices = invoices.slice(0, 5);

    if (recentInvoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">No invoices yet. <a href="invoice.html">Create one →</a></td></tr>';
        return;
    }

    tbody.innerHTML = recentInvoices.map(invoice => `
        <tr>
            <td><strong>${invoice.invoice_number}</strong></td>
            <td>${invoice.customer}</td>
            <td>${new Date(invoice.date).toLocaleDateString()}</td>
            <td>$${Number(invoice.total).toLocaleString()}</td>
            <td>
                <span class="status-badge status-${invoice.status}">
                    ${invoice.status}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewInvoice('${invoice.id}')">View</button>
                <button class="btn btn-sm btn-secondary" onclick="printInvoice('${invoice.invoice_number}')">Print</button>
            </td>
        </tr>
    `).join('');
}

function logout() {
    sessionStorage.clear();
    window.location.href = 'login.html';
}

window.showAllInvoices = function() {
    alert('Full invoices list coming soon!');
};

window.viewInvoice = function(id) {
    window.location.href = `invoice.html?id=${id}`;
};

window.printInvoice = function(invoiceNumber) {
    alert(`Printing ${invoiceNumber}...`);
};

window.exportData = function() {
    const dataStr = JSON.stringify({ invoices, customers }, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `erp-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
};
