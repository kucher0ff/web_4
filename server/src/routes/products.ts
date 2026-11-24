// src/routes/products.ts
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Применяем middleware аутентификации ко ВСЕМ маршрутам в этом файле
router.use(authenticate);

// --- ПОЛУЧЕНИЕ ТОВАРОВ (с поиском и сортировкой) ---
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { search, sortBy } = req.query;
    
    // 1. Права доступа: USER видит только свои товары, ADMIN — все
    const whereClause: any = {};
    if (req.userRole !== 'ADMIN') {
      whereClause.userId = req.userId;
    }

    // 2. Поиск: минимум по двум текстовым полям (name и category)
    if (search) {
      whereClause.OR = [
        { name: { contains: String(search) } },
        { category: { contains: String(search) } },
      ];
    }

    // 3. Сортировка: по названию или по цене (по умолчанию - новые сначала)
    let orderByClause: any = { createdAt: 'desc' };
    if (sortBy === 'name') orderByClause = { name: 'asc' };
    if (sortBy === 'price') orderByClause = { price: 'asc' };
    if (sortBy === 'price_desc') orderByClause = { price: 'desc' };

    const products = await prisma.product.findMany({
      where: whereClause,
      orderBy: orderByClause,
    });

    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при получении товаров' });
  }
});

// --- СОЗДАНИЕ ТОВАРА ---
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { name, category, price, quantity, description } = req.body;

    // Валидация
    if (!name || !category || price === undefined || quantity === undefined) {
      return res.status(400).json({ error: 'Заполните все обязательные поля' });
    }

    const product = await prisma.product.create({
      data: {
        name,
        category,
        price: Number(price),
        quantity: Number(quantity),
        description,
        userId: req.userId!, // Привязываем товар к текущему пользователю
      },
    });

    res.status(201).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при создании товара' });
  }
});

// --- ОБНОВЛЕНИЕ ТОВАРА (PATCH) ---
router.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    // Ищем товар, чтобы проверить права
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ error: 'Товар не найден' });

    // Если пользователь не админ и не владелец товара - запрещаем
    if (req.userRole !== 'ADMIN' && product.userId !== req.userId) {
      return res.status(403).json({ error: 'Нет прав на редактирование этого товара' });
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: req.body, // Prisma сама отфильтрует лишние поля
    });

    res.json(updatedProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при обновлении товара' });
  }
});

// --- УДАЛЕНИЕ ТОВАРА (DELETE) ---
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ error: 'Товар не найден' });

    if (req.userRole !== 'ADMIN' && product.userId !== req.userId) {
      return res.status(403).json({ error: 'Нет прав на удаление этого товара' });
    }

    await prisma.product.delete({ where: { id } });
    res.json({ message: 'Товар успешно удален' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при удалении товара' });
  }
});

export default router;