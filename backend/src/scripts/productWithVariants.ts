import 'dotenv/config';
import { ctJsonGet } from '../commercetools/client';

(async () => {
  const res = await ctJsonGet('/product-projections', {
    limit: 5,
    priceCurrency: 'USD',
    staged: false,
  });
  console.log(JSON.stringify(res, null, 2));
})();
