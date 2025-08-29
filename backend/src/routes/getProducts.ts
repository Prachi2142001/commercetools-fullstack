import { Router } from 'express';
import { listProducts, getProductByIdOrSlug } from '../services/fetchProducts';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { limit, offset, locale, currency, country, customerGroupId, channelId, staged } =
      req.query as Record<string, string>;

    const data = await listProducts({
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      locale,
      currency,
      country,
      customerGroupId,
      channelId,
      staged: staged === 'true',
    });

    res.json(data);
  } catch (err: any) {
    res.status(err?.status || 500).json({ error: err?.message || 'Unexpected error' });
  }
});

router.get('/:idOrSlug', async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const { locale, currency, country, customerGroupId, channelId, staged } =
      req.query as Record<string, string>;

    const data = await getProductByIdOrSlug(idOrSlug, {
      locale,
      currency,
      country,
      customerGroupId,
      channelId,
      staged: staged === 'true',
    });

    res.json(data);
  } catch (err: any) {
    res.status(err?.status || 500).json({ error: err?.message || 'Unexpected error' });
  }
});

export default router;
