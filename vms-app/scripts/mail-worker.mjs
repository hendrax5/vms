import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const client = new ImapFlow({
    host: process.env.IMAP_HOST || 'imap.example.com',
    port: parseInt(process.env.IMAP_PORT || '993'),
    secure: true,
    auth: {
        user: process.env.IMAP_USER || 'vms@example.com',
        pass: process.env.IMAP_PASS || 'password'
    },
    logger: false 
});

let isProcessing = false;

async function main() {
    console.log('VMS Mail Worker connecting...');
    try {
        await client.connect();
        console.log('VMS Mail Worker connected. Polling for new Permit Requests...');
        
        let lock = await client.getMailboxLock('INBOX');
        try {
            await client.mailboxOpen('INBOX');
            console.log('Watching INBOX for incoming messages...');
            
            client.on('exists', async (data) => {
                console.log(`New email exists event! Total msgs: ${data.count}`);
                await processUnseenMessagesSafe();
            });

            // Process immediately on start
            await processUnseenMessagesSafe();
        } finally {
            if (lock) {
                lock.release();
            }
        }
    } catch (err) {
        console.error('Mail Worker Error:', err);
    }
}

async function processUnseenMessagesSafe() {
    if (isProcessing) return;
    isProcessing = true;
    try {
        await processUnseenMessages();
    } finally {
        isProcessing = false;
    }
}

async function processUnseenMessages() {
    try {
        const messages = client.fetch({ seen: false }, { source: true, uid: true });
        for await (let msg of messages) {
            const parsed = await simpleParser(msg.source);
            
            console.log(`Processing email UID ${msg.uid} - Subject: ${parsed.subject}`);

            const text = parsed.text || '';
            const ptMatch = text.match(/PT:\s*(.+)/i);
            const visitorsMatch = text.match(/Visitors:\s*(.+)/i);
            const dateMatch = text.match(/Date:\s*(.+)/i);
            const siteMatch = text.match(/DC Site:\s*(.+)/i);
            const activityMatch = text.match(/Activity:\s*(.+)/i);

            if (ptMatch && visitorsMatch && dateMatch && siteMatch) {
                const companyName = ptMatch[1].trim();
                const visitors = visitorsMatch[1].trim();
                const visitDate = new Date(dateMatch[1].trim());
                const dcSiteCode = siteMatch[1].trim();
                const activity = activityMatch ? activityMatch[1].trim() : 'Maintenance';

                // Resolve Site ID
                const site = await prisma.dCSite.findUnique({ where: { code: dcSiteCode } });
                
                if (site) {
                    const newPermit = await prisma.visitPermit.create({
                        data: {
                            siteId: site.id,
                            companyName,
                            visitorNames: visitors,
                            scheduledAt: visitDate,
                            activity,
                            status: 'Pending'
                        }
                    });
                    console.log(`✅ Auto-created Permit for ${companyName} at ${site.name}`);
                    
                    // --- MOCK SENDING PORTAL LINK ---
                    console.log(`📧 [MOCK EMAIL] Sending Pre-Registration Portal Link to Visitor...`);
                    console.log(`   Link: http://localhost:3000/portal/${newPermit.id}`);
                    console.log(`   Action Required: Sign NDA to generate Access QR Code.`);
                    // --------------------------------

                } else {
                    console.log(`❌ Site Code ${dcSiteCode} not found in Database.`);
                }
            } else {
                 console.log(`❌ Invalid email format UID ${msg.uid}`);
            }

            // Mark as seen
            await client.messageFlagsAdd(msg.uid, ['\\Seen'], { uid: true });
        }
    } catch (e) {
        console.error('Error processing messages:', e);
    }
}

main().catch(err => console.error(err));
