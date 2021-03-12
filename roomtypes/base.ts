import * as WebSocket from 'ws';
import { toId } from '../utils';

// Represents a user connected to the site
export class User{
	id: number;
	ws: WebSocket;
	username: string;
	constructor(id: number, ws: WebSocket){
		this.id = id;
		this.ws = ws;
		this.username = 'Guest ' + id;
	}
	send(message: string){
		this.ws.send(message);
	}
}

// Base class for all possible room types
export class BaseRoom{
	id: string;
	name: string;
	users: {[id: number] : User};
	password: string;
	userCount: number;
	roomType: string;
	constructor(name: string, password: string){
		this.name = name;
		this.id = toId(name);
		this.users = {};
		this.password = password;
		this.userCount = 0;
		this.roomType = 'base';
	}

	addUser(user: User){
		if(this.users[user.id]) return;
		this.users[user.id] = user;
		this.sendInit(user);
		this.userCount += 1;
	}

	sendInit(user: User){
		user.send('|init|base|'+this.name+'|Welcome to '+this.name);
	}

	removeUser(user: User){
		if(!this.users[user.id]) return;
		delete this.users[user.id];
		this.sendDeinit(user);
		this.userCount -= 1;
	}

	sendDeinit(user: User){
		user.send('|deinit|'+this.id);
	}

	receiveMessage(from: User, messageParts: string[]){}

	// Gets a string representation of the room to be used in the client room list
	getRoomStr(): string {
		return `|${this.name},${this.userCount},${this.password ? 'y':'n'},${this.roomType}`;
	}
}
