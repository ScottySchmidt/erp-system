document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('loginForm');
    const errorEl = document.getElementById('errorMessage');

    form.addEventListener('submit', handleLogin);
});

async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('errorMessage');
    const loginBtn = document.getElementById('loginBtn');


    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';

    try {
        console.log('Attempting login for:', email);

        const result = await loginWithSupabase(email, password);

        if (result.success) {
    console.log('Login success:', result.user.email);
    window.location.href = 'dashboard.html';


    const userData = {
        email: result.user.email,
        uid: result.user.id || 'local-user',
        loggedInAt: new Date().toISOString()
    };

    sessionStorage.setItem('user', JSON.stringify(userData));
    console.log('Session stored:', userData);


    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 100);
} else {
            console.error(' Login failed:', result.error);
            showError(result.error);
        }
    } catch (error) {
        console.error(' Login error:', error);
        showError(error.message || 'Login failed');
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Login';
    }
}

async function loginWithSupabase(email, password) {
    try {
        const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js@2');

        const supabase = createClient(
            'https://uasshkfuiyslfhaaddrb.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhc3Noa2Z1aXlzbGZoYWFkZHJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDc1MDIsImV4cCI6MjA4NjkyMzUwMn0.8W6xIYwIz1U2_BlNNWIG200qAF4pjX97j6Yi-4njYh4'
            );

        console.log(' Supabase client created');

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        console.log('Supabase response:', { data: !!data, error: error?.message });

        if (error) {
            if (error.message.includes('Invalid login credentials')) {
                throw new Error('Wrong email or password');
            }
            if (error.message.includes('Email not confirmed')) {
                throw new Error('Please check your email to confirm account');
            }
            throw error;
        }

        return {
            success: true,
            user: data.user
        };
    } catch (error) {
        console.error('Supabase error details:', error);

        // Demo
        if (email === 'demo@erp.com' && password === 'password123') {
            return {
                success: true,
                user: { id: 'demo', email: 'demo@erp.com' }
            };
        }

        throw error;
    }
}

function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}

function checkAuth() {
    const user = sessionStorage.getItem('user');
    if (user) window.location.href = 'dashboard.html';
}
