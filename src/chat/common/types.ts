//import { Request } from 'express';
import { Socket } from 'socket.io';


// guard types
export type AuthPayload = {
  userId: string;
  userName: string;
  currentRooms: string[],
  currentWritingUser?: string,
};

//export type RequestWithAuth = Request & AuthPayload;
export type SocketWithAuth = Socket & AuthPayload;