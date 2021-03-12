import { BaseRoom, User } from './base';
import { toId } from '../utils';

// Chat room. Allows users to send/receive messages
export class ChatRoom extends BaseRoom{
	constructor(name: string, password: string){
		super(name, password);
		this.roomType = 'chat';
	}

	sendInit(user: User){
		user.send('|init|chat|'+this.name+'|Welcome to '+this.name);
	}

	broadcast(message: string){
		for(let i in this.users){
			this.users[i].send(message);
		}
	}

	// Called when a user sends a message to a room.
	// Checks if the user is in the room, then calls an appropriate function to process it.
	receiveMessage(from: User, messageParts: string[]){
		if(!this.users[from.id]){
			// User tried sending message to a room they aren't in
			return;
		}
		console.log('receiveMessage');
		console.log(messageParts);
		if(messageParts[0] === 't'){
			// Text message should be broadcast to other users
			let textMessage = messageParts.slice(1).join('|');
			this.broadcast(`${this.id}|t|${from.username}: ${textMessage}`);
		}
	}
}
