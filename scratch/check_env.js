require('dotenv').config();

console.log('--- Environment Check ---');
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS);
console.log('WHATSAPP_ACCESS_TOKEN:', process.env.WHATSAPP_ACCESS_TOKEN);

if (process.env.EMAIL_PASS === 'smtp.gmail.com') {
    console.warn('WARNING: EMAIL_PASS looks incorrect (set to smtp.gmail.com)');
}

if (process.env.WHATSAPP_ACCESS_TOKEN === 'your_token_here') {
    console.warn('WARNING: WHATSAPP_ACCESS_TOKEN is still a placeholder');
}
