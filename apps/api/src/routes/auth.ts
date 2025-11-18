import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/jwt.js';
import type { Env } from '../config/env.js';

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function authRoutes(app: FastifyInstance, env: Env) {
  // POST /auth/signup
  app.post('/auth/signup', async (request, reply) => {
    try {
      const body = SignupSchema.parse(request.body);

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (existingUser) {
        reply.code(400).send({
          error: {
            code: 'USER_EXISTS',
            message: 'User with this email already exists',
            requestId: request.id,
          },
        });
        return;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(body.password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: body.email,
          password: hashedPassword,
        },
        select: {
          id: true,
          email: true,
          createdAt: true,
        },
      });

      // Generate JWT token
      const token = signToken(
        {
          userId: user.id,
          email: user.email,
        },
        env
      );

      reply.code(201).send({
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.createdAt,
        },
        token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: error.errors,
            requestId: request.id,
          },
        });
        return;
      }

      request.log.error(error, 'Signup error');
      reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create user',
          requestId: request.id,
        },
      });
    }
  });

  // POST /auth/login
  app.post('/auth/login', async (request, reply) => {
    try {
      const body = LoginSchema.parse(request.body);

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (!user) {
        reply.code(401).send({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
            requestId: request.id,
          },
        });
        return;
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(body.password, user.password);

      if (!isValidPassword) {
        reply.code(401).send({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
            requestId: request.id,
          },
        });
        return;
      }

      // Generate JWT token
      const token = signToken(
        {
          userId: user.id,
          email: user.email,
        },
        env
      );

      reply.send({
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.createdAt,
        },
        token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: error.errors,
            requestId: request.id,
          },
        });
        return;
      }

      request.log.error(error, 'Login error');
      reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to login',
          requestId: request.id,
        },
      });
    }
  });
}
