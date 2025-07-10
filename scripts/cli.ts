import { main } from './createKeys.js';

main().catch((error) => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
});
