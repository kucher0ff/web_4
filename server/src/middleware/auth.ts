// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Расширяем стандартный тип Request, чтобы TypeScript не ругался на новые поля
export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Берем токен из заголовка Authorization (формат: "Bearer <токен>")
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Требуется авторизация (нет токена)' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Проверяем токен с помощью нашего секретного ключа
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: string;
      role: string;
    };

    // Прикрепляем данные пользователя к запросу, чтобы использовать их в роутах
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    
    next(); // Передаем управление дальше
  } catch (error) {
    res.status(401).json({ error: 'Неверный или просроченный токен' });
  }
};