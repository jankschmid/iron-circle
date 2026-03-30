import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Make sure to add RESEND_API_KEY_GMAIL or RESEND_API_KEY to your .env
const apiKey = process.env.RESEND_API_KEY_GMAIL || process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

export async function POST(request) {
    try {
        const body = await request.json();
        const { name, email, message } = body;

        if (!name || !email || !message) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check if API key exists
        if (!resend) {
            console.warn('RESEND_API_KEY not found. Simulating email send for dev environment.');
            console.log('--- EMAIL SIMULATION ---');
            console.log('From:', email);
            console.log('Name:', name);
            console.log('Message:', message);
            return NextResponse.json({ success: true, simulated: true });
        }

        // Send Email via Resend
        const data = await resend.emails.send({
            from: 'Iron Circle Kontakt <onboarding@resend.dev>', // Update this to your verified domain (e.g., info@iron-circle.app) when adding the DNS records to Resend.
            to: ['info@iron-circle.app'], // Der Empfänger der Support Anfragen
            replyTo: email,
            subject: `Neue Kontaktanfrage von ${name}`,
            text: `Name: ${name}\nE-Mail: ${email}\n\nNachricht:\n${message}`,
            html: `
                <h3>Neue Nachricht von ${name}</h3>
                <p><strong>E-Mail:</strong> ${email}</p>
                <hr />
                <p>${message.replace(/\n/g, '<br />')}</p>
            `
        });

        if (data.error) {
            console.error('Resend Error:', data.error);
            return NextResponse.json({ error: data.error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Contact Form Error:', error);
        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }
}
