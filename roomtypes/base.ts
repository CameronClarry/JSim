import * as WebSocket from 'ws';
import { toId } from '../utils';

// Represents a user connected to the site
export class User{
	id: number;
	ws: WebSocket;
	username: string;
	userid: string;
	constructor(id: number, ws: WebSocket){
		this.id = id;
		this.ws = ws;
		this.username = 'Guest ' + id;
		this.userid = toId(this.username);
	}
	setUsername(username: string){
		this.username = username;
		this.userid = toId(username);
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
	usernames: {[userid: string] : User};
	password: string;
	userCount: number;
	roomType: string;
	constructor(name: string, password: string){
		this.name = name;
		this.id = toId(name);
		this.users = {};
		this.usernames = {};
		this.password = password;
		this.userCount = 0;
		this.roomType = 'base';
	}

	addUser(user: User){
		if(this.users[user.id]) return;
		this.users[user.id] = user;
		this.usernames[user.userid] = user;
		this.sendInit(user);
		this.userCount += 1;
	}

	sendInit(user: User){
		user.send('|init|base|'+this.name+'|Welcome to '+this.name);
	}

	removeUser(user: User){
		if(!this.users[user.id]) return;
		delete this.users[user.id];
		delete this.usernames[user.userid];
		this.sendDeinit(user);
		this.userCount -= 1;
	}

	broadcastMessage(message: string){
		for(let i in this.users){
			this.users[i].send(message);
		}
	}

	nameChange(oldId: string, user: User){
		if(this.usernames[oldId]){
			delete this.usernames[oldId];
			this.usernames[user.userid] = user;
		}
		this.broadcastMessage(`${this.id}|cn|${oldId}|${user.username}`);
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
