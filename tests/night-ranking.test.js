const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadApp() {
  const code = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
  const context = {
    console,
    Intl,
    document: { addEventListener() {} }
  };

  vm.createContext(context);
  vm.runInContext(
    `${code}\n;globalThis.__test = { calculateGameResult };`,
    context
  );

  return context.__test;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, `../data/${file}.json`), "utf8"));
}

test("rebuying chip leader is ranked after the highest non-rebuy player for base points", () => {
  const api = loadApp();
  const rules = readJson("rules");
  const players = [
    { id: "anafkh", name: "Ana", avatar: "a.jpg" },
    { id: "gou", name: "Gou", avatar: "g.jpg" },
    { id: "kai", name: "Kai", avatar: "k.jpg" },
    { id: "lee", name: "Lee", avatar: "l.jpg" },
    { id: "moe", name: "Moe", avatar: "m.jpg" }
  ];
  const playersById = new Map(players.map((player) => [player.id, player]));
  const result = api.calculateGameResult(
    {
      id: "game-007",
      date: "2026-06-19",
      title: "复活筹码王顺延测试",
      dinnerCost: 0,
      buyInPerPlayer: 100,
      venueFee: 0,
      participants: [
        { playerId: "gou", finalChips: 4000, rebuys: 1 },
        { playerId: "anafkh", finalChips: 2000, rebuys: 0 },
        { playerId: "kai", finalChips: 1000, rebuys: 0 },
        { playerId: "lee", finalChips: -500, rebuys: 0 },
        { playerId: "moe", finalChips: -1500, rebuys: 0 }
      ]
    },
    playersById,
    rules
  );
  const rowsById = new Map(result.rows.map((row) => [row.playerId, row]));

  assert.equal(
    result.rows.slice(0, 3).map((row) => row.playerId).join(","),
    "anafkh,gou,kai"
  );

  assert.equal(rowsById.get("anafkh").rank, 1);
  assert.equal(rowsById.get("anafkh").basePoints, 12);
  assert.equal(rowsById.get("anafkh").nightReward, 170);

  assert.equal(rowsById.get("gou").rank, 2);
  assert.equal(rowsById.get("gou").basePoints, 10);
  assert.equal(rowsById.get("gou").chipBonusPoints, 8);
  assert.equal(rowsById.get("gou").rebuyPenaltyPoints, -2);
  assert.equal(rowsById.get("gou").nightPoints, 16);
  assert.equal(rowsById.get("gou").nightReward, 80);
});

test("equal chips ranks fewer rebuys ahead", () => {
  const api = loadApp();
  const rules = readJson("rules");
  const players = [
    { id: "a", name: "A", avatar: "a.jpg" },
    { id: "b", name: "B", avatar: "b.jpg" },
    { id: "c", name: "C", avatar: "c.jpg" },
    { id: "d", name: "D", avatar: "d.jpg" },
    { id: "e", name: "E", avatar: "e.jpg" }
  ];
  const playersById = new Map(players.map((player) => [player.id, player]));
  const result = api.calculateGameResult(
    {
      id: "tie-game",
      date: "2026-08-16",
      title: "同筹码测试局",
      dinnerCost: 0,
      buyInPerPlayer: 100,
      venueFee: 0,
      participants: [
        { playerId: "a", finalChips: -100, rebuys: 2 },
        { playerId: "b", finalChips: -100, rebuys: 0 },
        { playerId: "c", finalChips: 200, rebuys: 0 },
        { playerId: "d", finalChips: -100, rebuys: 1 },
        { playerId: "e", finalChips: -50, rebuys: 0 }
      ]
    },
    playersById,
    rules
  );

  assert.equal(
    result.rows.map((row) => row.playerId).join(","),
    "c,e,b,d,a"
  );
  assert.equal(result.rows.find((row) => row.playerId === "b").rank, 3);
  assert.equal(result.rows.find((row) => row.playerId === "d").rank, 4);
  assert.equal(result.rows.find((row) => row.playerId === "a").rank, 5);
});
