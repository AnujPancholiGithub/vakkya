import type { FastifyInstance } from 'fastify';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { projectService } from '../services/project.service.js';
import type { Env } from '../config/env.js';

// LiveKit room configuration
const ROOM_EMPTY_TIMEOUT_SECONDS = 300; // 5 minutes
const ROOM_MAX_PARTICIPANTS = 2; // User + Agent
const TOKEN_TTL = '1h';

// Zod schema for validation (64-char hex token)
const ValidateTokenSchema = z.object({
  widgetToken: z.string().length(64).regex(/^[a-f0-9]+$/i, 'Token must be hexadecimal'),
});

export async function widgetRoutes(app: FastifyInstance, env: Env) {
  // Create RoomServiceClient for room management
  const roomService = new RoomServiceClient(
    env.LIVEKIT_URL.replace('wss://', 'https://'),
    env.LIVEKIT_API_KEY,
    env.LIVEKIT_API_SECRET
  );

  // POST /validate-token - Validate widget token and return LiveKit credentials
  // Rate limited to prevent brute-force token enumeration attacks
  app.post('/validate-token', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    try {
      const body = ValidateTokenSchema.parse(request.body);

      // Validate token using project service
      const projectConfig = await projectService.validateToken(body.widgetToken);

      if (!projectConfig) {
        reply.code(401).send({
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid widget token',
            requestId: request.id,
          },
        });
        return;
      }

      // Generate LiveKit room token with cryptographically secure identifiers
      const roomSuffix = randomBytes(8).toString('hex');
      const roomName = `vakkya-${projectConfig.projectId}-${roomSuffix}`;
      const participantIdentity = `user-${randomBytes(8).toString('hex')}`;
      
      // Room metadata for voice agent (includes agent config for dynamic instructions)
      const roomMetadata = JSON.stringify({
        project_id: projectConfig.projectId,
        widget_token: body.widgetToken,
        system_prompt: projectConfig.systemPrompt,
        agent_name: projectConfig.agentName,
      });
      
      // Create room with metadata (so voice agent can read it)
      try {
        await roomService.createRoom({
          name: roomName,
          metadata: roomMetadata,
          emptyTimeout: ROOM_EMPTY_TIMEOUT_SECONDS,
          maxParticipants: ROOM_MAX_PARTICIPANTS,
        });
      } catch (err) {
        // Only ignore "room already exists" errors, fail on other errors
        const errorMessage = err instanceof Error ? err.message : String(err);
        const isRoomExistsError = errorMessage.includes('already exists') || 
                                   errorMessage.includes('duplicate');
        
        if (!isRoomExistsError) {
          request.log.error({ err, roomName }, 'Failed to create LiveKit room');
          reply.code(503).send({
            error: {
              code: 'SERVICE_UNAVAILABLE',
              message: 'Voice service temporarily unavailable',
              requestId: request.id,
            },
          });
          return;
        }
        request.log.debug({ roomName }, 'Room already exists, reusing');
      }
      
      const at = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
        identity: participantIdentity,
        ttl: TOKEN_TTL,
      });
      
      at.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });
      
      // Also add metadata to participant token
      at.metadata = roomMetadata;

      const livekitToken = await at.toJwt();

      // Return LiveKit credentials
      reply.send({
        projectId: projectConfig.projectId,
        projectName: projectConfig.name,
        livekitUrl: env.LIVEKIT_URL,
        livekitToken,
        roomName,
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

      request.log.error(error, 'Token validation error');
      reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to validate token',
          requestId: request.id,
        },
      });
    }
  });
}
