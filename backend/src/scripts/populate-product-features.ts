import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { updateAllProductFeatures } from '../services/recommendation/feature-extractor';

const prisma = new PrismaClient();

async function main() {
  const total = await prisma.product.count();
  console.log(`Found ${total} products in database.`);

  if (total === 0) {
    console.log('No products found. Run the seed first: npm run db:seed');
    return;
  }

  console.log('Extracting and upserting ProductFeature records...');
  await updateAllProductFeatures();

  const populated = await prisma.productFeature.count();
  console.log(`Done. ${populated} ProductFeature records now exist.`);

  // Spot-check one record to confirm vector is non-trivial
  const sample = await prisma.productFeature.findFirst({
    select: { productId: true, featureVector: true, styleTags: true, colorFamily: true }
  });
  if (sample) {
    const vec: number[] = JSON.parse(sample.featureVector);
    const nonZero = vec.filter(v => v !== 0).length;
    console.log(`Sample product ${sample.productId}: ${nonZero}/20 non-zero vector dims, colorFamily=${sample.colorFamily}, styleTags=${sample.styleTags}`);
  }
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
