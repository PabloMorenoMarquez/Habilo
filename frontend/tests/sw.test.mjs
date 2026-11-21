// Pruebas del service worker (public/sw.js) con caché y red simuladas.
// Ejecutar: node --test tests/
import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import vm from "node:vm"

const SOURCE = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8")
const ORIGIN = "https://habilo.es"

function setup({ cached = {}, network = {}, cacheNames = [] } = {}) {
  const stores = new Map(cacheNames.map((n) => [n, new Map()]))
  const fetched = []
  const handlers = {}
  const key = (r) => (typeof r === "string" ? new URL(r, ORIGIN).href : r.url)
  const openStore = (name) => {
    if (!stores.has(name)) stores.set(name, new Map())
    const store = stores.get(name)
    return {
      match: async (r) => store.get(key(r)),
      put: async (r, res) => void store.set(key(r), res),
      addAll: async (urls) => urls.forEach((u) => store.set(key(u), network[key(u)] ?? new Response("shell"))),
    }
  }
  const caches = {
    open: async (name) => openStore(name),
    keys: async () => [...stores.keys()],
    delete: async (name) => stores.delete(name),
    match: async (r) => {
      for (const store of stores.values()) if (store.has(key(r))) return store.get(key(r))
      return undefined
    },
  }
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type, fn) => (handlers[type] = fn),
    skipWaiting: () => {},
    clients: { claim: async () => {} },
    registration: {},
  }
  const fetch = async (r) => {
    fetched.push(key(r))
    const res = network[key(r)]
    if (!res) throw new TypeError("Failed to fetch")
    return res.clone()
  }
  vm.runInNewContext(SOURCE, { self, caches, fetch, URL, Response, Promise, console })

  const dispatch = async (type, request) => {
    let responded
    const waits = []
    handlers[type]({
      request,
      respondWith: (p) => (responded = p),
      waitUntil: (p) => waits.push(p),
    })
    await Promise.all(waits)
    return responded
  }
  const seed = async (name) => {
    const store = await caches.open(name)
    for (const [u, body] of Object.entries(cached)) await store.put(u, new Response(body))
  }
  return { dispatch, seed, stores, fetched, caches }
}

const page = (path) => ({ url: ORIGIN + path, method: "GET", mode: "navigate", headers: new Headers() })
const asset = (path) => ({ url: ORIGIN + path, method: "GET", mode: "no-cors", headers: new Headers() })

async function activeCacheName(sw) {
  await sw.dispatch("install")
  await sw.dispatch("activate")
  return [...sw.stores.keys()][0]
}

test("una página se pide siempre a la red aunque haya una copia vieja", async () => {
  const sw = setup({ network: { [ORIGIN + "/"]: new Response("portada nueva") } })
  const name = await activeCacheName(sw)
  const store = await sw.caches.open(name)
  await store.put(ORIGIN + "/", new Response("portada vieja"))

  const res = await sw.dispatch("fetch", page("/"))
  assert.equal(await (await res).text(), "portada nueva")
})

test("sin conexión, una página sale de su copia guardada", async () => {
  const sw = setup({})
  const name = await activeCacheName(sw)
  const store = await sw.caches.open(name)
  await store.put(ORIGIN + "/blog", new Response("blog guardado"))

  const res = await sw.dispatch("fetch", page("/blog")) // la red falla: no está en `network`
  assert.equal(await (await res).text(), "blog guardado")
})

test("sin conexión y sin copia, una página cae en la portada guardada", async () => {
  const sw = setup({ network: { [ORIGIN + "/"]: new Response("portada") } })
  await activeCacheName(sw) // install guarda "/"
  delete sw.fetched

  const res = await sw.dispatch("fetch", page("/profesores/x"))
  assert.equal(await (await res).text(), "portada")
})

test("una página que llega bien de la red se guarda para usarla sin conexión", async () => {
  const sw = setup({ network: { [ORIGIN + "/blog"]: new Response("blog") } })
  const name = await activeCacheName(sw)
  await (await sw.dispatch("fetch", page("/blog")))
  await new Promise((r) => setTimeout(r, 0))
  const saved = await (await sw.caches.open(name)).match(ORIGIN + "/blog")
  assert.equal(await saved.text(), "blog")
})

test("los datos de navegación de Next (_rsc) no se sirven de caché", async () => {
  const url = "/profesores/x?_rsc=abc"
  const sw = setup({ network: { [ORIGIN + url]: new Response("datos nuevos") } })
  const name = await activeCacheName(sw)
  const store = await sw.caches.open(name)
  await store.put(ORIGIN + url, new Response("datos viejos"))

  const res = await sw.dispatch("fetch", asset(url))
  assert.equal(res, undefined, "no responde el service worker: el navegador va a la red")
})

test("los ficheros con hash de /_next/static salen de caché sin ir a la red", async () => {
  const url = "/_next/static/chunks/app-123.js"
  const sw = setup({})
  const name = await activeCacheName(sw)
  const store = await sw.caches.open(name)
  await store.put(ORIGIN + url, new Response("js"))

  const res = await sw.dispatch("fetch", asset(url))
  assert.equal(await (await res).text(), "js")
  assert.ok(!sw.fetched.includes(ORIGIN + url))
})

test("al activarse borra la caché antigua serviclick-shell-v1", async () => {
  const sw = setup({ cacheNames: ["serviclick-shell-v1"] })
  await sw.dispatch("install")
  await sw.dispatch("activate")
  assert.ok(!sw.stores.has("serviclick-shell-v1"))
  assert.equal(sw.stores.size, 1)
})

test("no toca peticiones a otros dominios", async () => {
  const sw = setup({})
  await activeCacheName(sw)
  const res = await sw.dispatch("fetch", { url: "https://api.habilo.es/x", method: "GET", mode: "cors", headers: new Headers() })
  assert.equal(res, undefined)
})
