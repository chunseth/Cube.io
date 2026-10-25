const { test } = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const { DatabaseSync } = require("node:sqlite");
const { CREATE_SCHEMA } = require("../.test-build/database/schema");

test("existing SQLite data migrates, comments survive restart, and solves move in either session order", async () => {
  const db = new DatabaseSync(":memory:");
  db.exec(CREATE_SCHEMA);
  db.prepare("INSERT INTO sessions(id,name) VALUES(?,?)").run(
    "main",
    "Default Session",
  );
  db.prepare("INSERT INTO solves VALUES(?,?,?,?,?,?,?)").run(
    "solve",
    "main",
    10000,
    "R U R'",
    "none",
    "timer",
    1000,
  );
  db.prepare("INSERT INTO app_state VALUES(1,?)").run(
    JSON.stringify({ activeSessionId: "main" }),
  );
  const adapter = {
    execAsync: async (sql) => db.exec(sql),
    getAllAsync: async (sql) => db.prepare(sql).all(),
    getFirstAsync: async (sql) => db.prepare(sql).get(),
    runAsync: async (sql, ...args) => db.prepare(sql).run(...args),
    withTransactionAsync: async (fn) => {
      db.exec("BEGIN");
      try {
        await fn();
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
  };
  const original = Module._load;
  let repository;
  try {
    Module._load = function (name, ...args) {
      if (name === "expo-sqlite")
        return { openDatabaseAsync: async () => adapter };
      if (name === "@react-native-async-storage/async-storage")
        return { getItem: async () => null };
      return original.call(this, name, ...args);
    };
    repository = require("../scripts/load-domain.cjs")(
      "../database/repository",
    );
  } finally {
    Module._load = original;
  }
  const { moveSolve } = require("../scripts/load-domain.cjs")("solveList");
  try {
    let store = await repository.loadStore();
    assert.equal(store.sessions[0].createdAt, 1000);
    store = {
      ...store,
      sessions: store.sessions.map((s) => ({
        ...s,
        solves: s.solves.map((x) => ({
          ...x,
          comment: "Saved comment",
          penalty: "+2",
        })),
      })),
    };
    await repository.saveStore(store);
    store = moveSolve(store, "solve", "pll-practice");
    await repository.saveStore(store);
    store = await repository.loadStore();
    assert.equal(store.sessions.find((s) => s.id === "main").solves.length, 0);
    assert.equal(
      store.sessions.find((s) => s.id === "pll-practice").solves[0].comment,
      "Saved comment",
    );
    store = moveSolve(store, "solve", "main");
    await repository.saveStore(store);
    store = await repository.loadStore();
    assert.equal(
      store.sessions.find((s) => s.id === "main").solves[0].penalty,
      "+2",
    );
    assert.equal(
      store.sessions.find((s) => s.id === "pll-practice").solves.length,
      0,
    );
    store = {
      ...store,
      sessions: store.sessions.map((s) => ({ ...s, solves: [] })),
    };
    await repository.saveStore(store);
    assert.equal(
      db.prepare("SELECT COUNT(*) AS count FROM solves").get().count,
      0,
    );
  } finally {
    db.close();
  }
});
