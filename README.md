# wsnet-server

## Basic Setup

```js
import { log } from "console";
import { createServer } from "wsnet-server";

//create the websocket server on port 8080
createServer({ port: 8080 }, async (client) => {

  //get the params that are passed by the client
  client.onParams((data) => log(data));
  
  //on get on the "echo" route >> response
  client.onGet("echo", async (data) => {
    //get resource from client on the clients "echo" route and sent it back
    //it can be an Error or a object|string|array|...
    //maybe the client is corrupt and sends some wrong or no response back (don't use it)
    //if the client hasn't send the response back after 1min it returns an error 
    return await client.get("echo", data);
  });
  
  //listen for posts and resent them
  client.onSay("echo", (data) => {
    //resent the data to the client say "echo" route
    client.say("echo", data);
  });
});
```

## Methods

### 1. Get / onGet

#### can handle only one handler per key

### 2. Say / onSay

#### can handle unlimited handler per key

### 3. Params

#### only one time