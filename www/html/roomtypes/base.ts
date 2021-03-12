import { toId } from '../utils.js';

// The base room class for the client. Functions as a text chat.
export class BaseRoom{
	name: string;
	id: string;
	mainDiv: HTMLElement;
	option: HTMLOptionElement;
	webSocket: WebSocket;
    constructor(name: string, initString: string, mainDiv: HTMLElement, webSocket: WebSocket){
		this.name = name;
		this.id = toId(name);
		this.webSocket = webSocket;
		this.populateDiv(mainDiv);
		this.mainDiv = mainDiv;
		this.mainDiv.className = 'roomdiv';
		this.fillContent(initString);
		this.option = document.createElement('option');
		this.option.value = this.id;
		this.option.text = this.name;
    }

	populateDiv(mainDiv: HTMLElement){}

	fillContent(initString: string){}

	receiveMessage(messageParts: string[]){}

	disable(){}
}
