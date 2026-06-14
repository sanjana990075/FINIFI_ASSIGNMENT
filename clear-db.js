import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI is not defined in environment variables');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected successfully.');

    const collections = ['purchaseorders', 'grns', 'invoices', 'matchresults'];
    for (const name of collections) {
      try {
        await mongoose.connection.db.collection(name).deleteMany({});
        console.log(`Cleared collection: ${name}`);
      } catch (e) {
        console.log(`Collection ${name} might not exist yet.`);
      }
    }

    console.log('\nDatabase reset complete! You can now upload PO, GRN, and Invoice documents from scratch.');
  } catch (err) {
    console.error('Error clearing database:', err);
  } finally {
    await mongoose.disconnect();
  }
}

main();
