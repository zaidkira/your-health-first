const http = require('http');

async function test() {
  try {
    const res = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dr. Test Node',
        email: 'testnode@example.com',
        password: 'password123',
        wilaya: 'Algiers',
        role: 'doctor',
        doctorProfile: {
          specialty: 'Cardiologist',
          address: '123 Test St',
          availableDays: 'Mon-Fri',
          availableHours: '08:00 - 17:00',
          consultationFee: 2000,
          isOnlineConsultation: true
        }
      })
    });
    console.log('Register Status:', res.status);
    console.log('Register Body:', await res.text());

    const docRes = await fetch('http://localhost:5000/api/doctors');
    console.log('Doctors Status:', docRes.status);
    console.log('Doctors Body:', await docRes.text());
  } catch (err) {
    console.error(err);
  }
}

test();
