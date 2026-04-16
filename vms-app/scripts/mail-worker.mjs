import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Manage active clients
const activeClients = new Map();

async function delay(ms) {
    return new Promise(res => setTimeout(res, ms));
}

async function startWorkerForConfig(config) {
    console.log(`[Mail-Worker] Starting IMAP for Datacenter ID: ${config.datacenterId} (${config.imapHost})`);
    
    const client = new ImapFlow({
        host: config.imapHost,
        port: config.imapPort,
        secure: true,
        auth: {
            user: config.imapUser,
            pass: config.imapPass
        },
        logger: false 
    });

    let isProcessing = false;

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
                console.log(`[DC-${config.datacenterId}] Processing email UID ${msg.uid} - Subject: ${parsed.subject}`);

                const fromAddr = parsed.from?.value[0]?.address || 'unknown';
                const toAddr = parsed.to?.value[0]?.address || 'unknown';
                const subject = parsed.subject || 'No Subject';
                const bodyText = parsed.text || '';
                const htmlContent = parsed.html || parsed.textAsHtml || '';

                // Extract a threadId if possible from references
                const threadId = parsed.references ? (Array.isArray(parsed.references) ? parsed.references[0] : parsed.references) : parsed.messageId || null;

                // 1. SAVE TO UNIFIED INBOX ALWAYS
                await prisma.inboxMessage.upsert({
                    where: { messageId: parsed.messageId || msg.uid.toString() },
                    update: {},
                    create: {
                        datacenterId: config.datacenterId,
                        messageId: parsed.messageId || msg.uid.toString(),
                        threadId: threadId,
                        from: fromAddr,
                        to: toAddr,
                        subject: subject,
                        bodyText: bodyText,
                        htmlContent: htmlContent,
                        receivedAt: parsed.date || new Date(),
                        isRead: false
                    }
                });

                // 2. CHECK LEGACY PERMIT GENERATION (Regex Matching)
                const text = bodyText;
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

                    const site = await prisma.dCSite.findUnique({ where: { code: dcSiteCode } });
                    
                    if (site) {
                        await prisma.visitPermit.create({
                            data: {
                                siteId: site.id,
                                companyName,
                                visitorNames: visitors,
                                scheduledAt: visitDate,
                                activity,
                                status: 'Pending'
                            }
                        });
                        console.log(`[DC-${config.datacenterId}] ✅ Auto-created Permit for ${companyName} at ${site.name}`);
                    }
                }

                // 3. MARK EMAIL AS SEEN SO IT DOESN'T PROCESS AGAIN
                await client.messageFlagsAdd({ uid: msg.uid }, ['\\Seen']);
            }
        } catch (err) {
            console.error(`[DC-${config.datacenterId}] Error syncing messages:`, err);
        }
    }

    try {
        await client.connect();
        console.log(`[DC-${config.datacenterId}] ✅ Worker connected. Polling INBOX...`);
        
        let lock = await client.getMailboxLock('INBOX');
        try {
            await client.mailboxOpen('INBOX');
            client.on('exists', async (data) => {
                await processUnseenMessagesSafe();
            });
            await processUnseenMessagesSafe(); // Initial Check
        } finally {
            if (lock) lock.release();
        }
    } catch (err) {
        console.error(`[DC-${config.datacenterId}] ⚠️ Connection Failed:`, err.message);
        client.close().catch(() => {});
        throw err; // Let manager handle retry
    }
}

async function loopWorker(config) {
    while (true) {
        try {
            await startWorkerForConfig(config);
        } catch (e) {
            console.log(`[DC-${config.datacenterId}] 🔄 Retrying connection in 60s...`);
            await delay(60000);
        }
    }
}

async function managerMain() {
    console.log('VMS Mail Sync Manager starting...');
    
    // Periodically check for updated active configurations from the DB
    setInterval(async () => {
        try {
            const configs = await prisma.datacenterMailConfig.findMany({ where: { isActive: true } });
            
            for (const conf of configs) {
                if (!activeClients.has(conf.id)) {
                    // Spawn a new loop
                    const workerPromise = loopWorker(conf);
                    activeClients.set(conf.id, workerPromise);
                }
            }
        } catch (err) {
            console.error('Core DB Poll Error:', err);
        }
    }, 15000); // Check for new IMAP integrations every 15 seconds!

    // Wait forever
    await new Promise(() => {});
}

managerMain().catch(err => console.error(err));
