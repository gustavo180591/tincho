// Script para hacer login como admin
const response = await fetch('http://localhost:5173/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'admin@test.com',
    password: 'admin123'
  })
});

const data = await response.json();
console.log('Login response:', data);

if (response.ok) {
  console.log('Login successful! Cookie should be set.');
} else {
  console.log('Login failed:', data.error);
}
