import crypto from "crypto"
import WebSocketServer from "ws"

function randomBytes(l) {
    return crypto.randomBytes(l).toString("base64url")
}

export class Client {

    #rawSocket = false

    #obj = {
        on: {
            get: {},
            say: {},
            params: () => false
        },
        getPromises: {}
    }

    constructor(socket) {

        this.#rawSocket = socket

        this.#rawSocket.onclose = code => {
            this.onclose(code)
        }

        this.#rawSocket.onerror = err => {
            this.onerror(err)
        }

        this.#rawSocket.onmessage = chunk => {
            this.#onmessage(chunk)
        }

    }

    getState() { return this.#rawSocket.readyState; }

    close() { this.#rawSocket.close() }

    //noraml listeners

    onSay(key, handler, replace = false) {

        if (replace || !this.#obj.on.say[key])
            this.#obj.on.say[key] = [handler];
        else this.#obj.on.say[key].push(handler);

    }

    onGet(key, handler) {

        this.#obj.on.get[key] = handler;

    }

    onParams(handler) {
        this.#obj.on.params = handler
    }

    //Normal Methodas

    say(key, data) {

        this.#send("say", key, data, false);

    }

    get(key, data) {

        var id = randomBytes(8);

        return new Promise((reslove) => {

            var rejectTimeout = setTimeout(() => {
                delete this.#obj.getPromises[id];
                reslove(new Error("too long"))
            }, 60000)

            this.#obj.getPromises[id] = res => {
                clearTimeout(rejectTimeout);
                delete this.#obj.getPromises[id];
                reslove(res);
            };

            this.#send("get", key, data, id)

        })

    }

    //Send and Onmessage

    #onmessage({ data }) {

        try {

            try {
                var data = JSON.parse(data);
            } catch (error) {
                return
            }

            //onSay
            if (data?.method == "say" && data?.key) {
                if (this.#obj.on.say?.[data.key])
                    this.#obj.on.say[data.key].forEach(fn => fn(data?.cont))
            }
            //onGet
            else if (data?.method == "get" && data?.key && data?.id) {

                const sendBack = cont => {
                    this.#send("getback", false, cont, data.id)
                }

                if (!this.#obj.on.get[data?.key])
                    return sendBack("not found")

                var res = this.#obj.on.get[data?.key](data?.cont)

                if (res instanceof Promise) {
                    res.then(res => sendBack(res))
                } else {
                    sendBack(res)
                }

            }
            //For getting data Back
            else if (data?.method == "getback" && data?.id) {
                if (this.#obj.getPromises?.[data.id])
                    this.#obj.getPromises?.[data.id]?.(data?.cont);
            }
            else if (data?.method == "params") {
                this.#obj.on?.params?.(data?.cont)
            }

        } catch (error) { console.log(error) }

    }

    #send(method, key, cont, id) {

        var data = {
            method,
            cont
        }

        if (key) data.key = key
        if (id) data.id = id;

        this.#rawSocket.send(JSON.stringify(data))

    }

    //Other Handlers

    onclose() { }
    onerror() { }
    onend() { }

};

function defaultHandler(client = new Client()) { }

export function createServer({ port = 8080 }, handler = defaultHandler) {
    new WebSocketServer({ port })
        .on("connection",
            socket => handler(new Client(socket))
        )
}

process.on("uncaughtException", err => { console.error(err) })