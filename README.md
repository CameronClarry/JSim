# JSim
An open source Jeopardy simulator

## Compiling
First, install the necessary Node modules:
```
npm install
```
Make typescript is installed so you can use the compiler, `tsc`. Then you can compile the server with
```
tsc
```
the client with
```
tsc -p www/
```
or both with
```
source compile.sh
```

## Running
The main file is the generated `server.js`, and it is run by
```
node server.js
```
This will provide the websocket and serve the HTML on ports 9000 and 9443. Public/private keys will need to be given in
```
certs/fullchain.pem
certs/privkey.pem
```
