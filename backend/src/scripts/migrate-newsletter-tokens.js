const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function main() {
  const subscribers = await prisma.newsletterSubscriber.findMany({
    where: { unsubscribeToken: null }
  });

  console.log(`Found ${subscribers.length} subscribers without unsubscribe tokens`);

  for (const sub of subscribers) {
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.newsletterSubscriber.update({
      where: { id: sub.id },
      data: { unsubscribeToken: token }
    });
  }

  console.log(`Updated ${subscribers.length} subscribers with unsubscribe tokens`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
