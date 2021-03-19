import { BaseRoom } from './base.js';

// A room that users can send messages to each other in
export class ChatRoom extends BaseRoom{
	textArea!: HTMLTextAreaElement;
	br!: HTMLElement;
	textInput!: HTMLInputElement;
	constructor(name: string, initString: string, mainDiv: HTMLElement, webSocket: WebSocket){
		super(name, initString, mainDiv, webSocket);
	}
	populateDiv(mainDiv: HTMLElement){
		// Create the text area and the input
		this.textArea = document.createElement('textarea');
		this.textArea.disabled = true;
		this.br = document.createElement('br');
		this.textInput = document.createElement('input');
		this.textInput.type = 'text';
		this.textInput.onkeypress = (event)=>{
			if(event.keyCode == 13 || event.which == 13){
				this.webSocket.send(this.id+'|t|'+this.textInput.value);
				this.textInput.value = '';
			}
		}

		mainDiv.appendChild(this.textArea);
		mainDiv.appendChild(this.br);
		mainDiv.appendChild(this.textInput);
	}
	fillContent(initString: string){
		// Fill in the text area with the init string
		this.textArea.value = initString;
	}
	receiveMessage(messageParts: string[]){
		if(messageParts[0] === 't'){
			if(this.textArea){
				this.textArea.value = this.textArea.value + '\n' + messageParts.slice(1).join('|');
			}
		}
	}
	disable(){
		this.textArea.value = this.textArea.value + '\n There was an error in the websocket. The server may not be running.';
		this.textInput.disabled = true;
	}
}
