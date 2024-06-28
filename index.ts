import crypto from "crypto";
import { WebSocketServer, WebSocket } from "ws";

function randomBytes(l: number): string {
    return crypto.randomBytes(l).toString("base64url");
}

interface HandlerObject {
    [key: string]: ((data: any) => void)[];
}

interface GetHandlerObject {
    [key: string]: (data: any) => any;
}

interface PromisesObject {
    [key: string]: (data: any) => void;
}

interface Obj {
    on: {
        get: GetHandlerObject;
        say: HandlerObject;
        params: (data: any) => any;
    };
    getPromises: PromisesObject;
}

export class Client {
    #rawSocket: WebSocket;
    #obj: Obj = {
        on: {
            get: {},
            say: {},
            params: () => false
        },
        getPromises: {}
    };

    constructor(socket: WebSocket) {
        this.#rawSocket = socket;

        this.#rawSocket.onclose = (event: CloseEvent) => {
            this.onclose(event.code);
        };

        this.#rawSocket.onerror = (event: Event) => {
            this.onerror(event);
        };

        this.#rawSocket.onmessage = (event: MessageEvent) => {
            this.#onmessage(event);
        };
    }

    getState(): number {
        return this.#rawSocket.readyState;
    }

    close(): void {
        this.#rawSocket.close();
    }

    // Normal listeners

    onSay(key: string, handler: (data: any) => void, replace = false): void {
        if (replace || !this.#obj.on.say[key]) {
            this.#obj.on.say[key] = [handler];
        } else {
            this.#obj.on.say[key].push(handler);
        }
    }

    onGet(key: string, handler: (data: any) => any): void {
        this.#obj.on.get[key] = handler;
    }

    onParams(handler: (data: any) => any): void {
        this.#obj.on.params = handler;
    }

    // Normal Methods

    say(key: string, data: any): void {
        this.#send("say", key, data, false);
    }

    get(key: string, data: any): Promise<any> {
        const id = randomBytes(8);

        return new Promise((resolve) => {
            const rejectTimeout = setTimeout(() => {
                delete this.#obj.getPromises[id];
                resolve(new Error("too long"));
            }, 60000);

            this.#obj.getPromises[id] = (res) => {
                clearTimeout(rejectTimeout);
                delete this.#obj.getPromises[id];
                resolve(res);
            };

            this.#send("get", key, data, id);
        });
    }

    // Send and Onmessage

    #onmessage(event: MessageEvent): void {
        const data = JSON.parse(event.data);

        try {
            if (data?.method === "say" && data?.key) {
                if (this.#obj.on.say?.[data.key]) {
                    this.#obj.on.say[data.key].forEach(fn => fn(data?.cont));
                }
            }
            else if (data?.method === "get" && data?.key && data?.id) {
                const sendBack = (cont: any) => {
                    this.#send("getback", false, cont, data.id);
                };

                if (!this.#obj.on.get[data?.key]) {
                    return sendBack("not found");
                }

                const res = this.#obj.on.get[data?.key](data?.cont);

                if (res instanceof Promise) {
                    res.then(res => sendBack(res));
                } else {
                    sendBack(res);
                }
            }
            else if (data?.method === "getback" && data?.id) {
                if (this.#obj.getPromises?.[data.id]) {
                    this.#obj.getPromises?.[data.id]?.(data?.cont);
                }
            }
            else if (data?.method === "params") {
                this.#obj.on?.params?.(data?.cont);
            }
        } catch (error) {
            console.log(error);
        }
    }

    #send(method: string, key: string | false, cont: any, id?: string | false): void {
        const data: any = { method, cont };
        if (key) data.key = key;
        if (id) data.id = id;

        this.#rawSocket.send(JSON.stringify(data));
    }

    // Other Handlers

    onclose(code: number): void { code }
    onerror(err: any): void { err }
    onend(): void { }
}

export function defaultHandler(client: Client = new Client(new WebSocket(''))): void { }

export function createServer({ port = 8080 }: { port?: number }, handler: (client: Client) => void = defaultHandler): WebSocketServer {
    return new WebSocketServer({ port })
        .on("connection", (socket: WebSocket) => handler(new Client(socket)));
}

process.on("uncaughtException", (err: Error) => {
    console.error(err);
});