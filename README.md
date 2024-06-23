# wsnet-server

## Basic Setup

```js
import { log } from "console";
import { createServer } from "WSNET_Framework/_server/index.js";
const port = 8080;

//create the server on port 8080
createServer({ port }, async (client) => {
  //get the params
  client.onParams((data) => log(data));
  //on request the echo key
  client.onGet("echo", async (data) => {
    //get resource from client
    return await client.get("echo", data);
  });
  //listen for posts and resent them
  client.onSay("echo", (data) => {
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