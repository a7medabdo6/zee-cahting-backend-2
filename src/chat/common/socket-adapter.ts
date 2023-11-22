import { INestApplicationContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server, ServerOptions } from 'socket.io';
import { SocketWithAuth } from './types';
import { UserService } from 'src/user/user.service';

export class SocketIOAdapter extends IoAdapter {
    constructor(
        private app: INestApplicationContext,
        private configService: ConfigService,
    ) {
        super(app);
    }

    createIOServer(port: number, options?: ServerOptions) {
        const clientPort = parseInt(this.configService.get('CLIENT_PORT'));

        const cors = {
            origin: [
                `http://localhost:${clientPort}`,
                new RegExp(`/^http:\/\/192\.168\.1\.([1-9]|[1-9]\d):${clientPort}$/`),
            ],
        };

        console.log('Configuring SocketIO server with custom CORS options');

        const optionsWithCORS: ServerOptions = {
            ...options,
            cors,
        };

        const jwtService = this.app.get(JwtService);
        const userService = this.app.get(UserService);

        const server: Server = super.createIOServer(port, optionsWithCORS);

        server.of('').use(createTokenMiddleware(jwtService, userService));

        return server;
    }
}

const createTokenMiddleware =
    (jwtService: JwtService, userService: UserService) =>
        (socket: SocketWithAuth, next) => {

            const token = socket.handshake.headers.authorization.split('Bearer ')[1];

            try {
                const payload = jwtService.verify(token);
                socket.userId = payload.id;

                return new Promise(async () => {
                    const user = await userService.getUserDataForSocket(socket.userId);
                    if (user) {
                        socket.userName = user.username;
                        socket.currentRooms = [];
                        next();
                    }
                    else {
                        next(new Error('FORBIDDEN'));
                    }
                });
            } catch {
                next(new Error('FORBIDDEN'));
            }
        };