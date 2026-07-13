const SUITS = ["♠", "♥", "♦", "♣"];
const SUIT_KEYS = ["S", "H", "D", "C"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const HI_OPT_II = { A: 0, "2": 1, "3": 1, "4": 2, "5": 2, "6": 1, "7": 1, "8": 0, "9": 0, "10": -2, J: -2, Q: -2, K: -2 };

const state = {
  runningCount: 0,
  cardsSeen: 0,
  burnPile: [],
  perCardRemaining: {},
};

const els = {
  deckCount: document.getElementById("deckCount"),
  penetrationAlert: document.getElementById("penetrationAlert"),
  runningCount: document.getElementById("runningCount"),
  trueCount: document.getElementById("trueCount"),
  cardsRemaining: document.getElementById("cardsRemaining"),
  decksRemaining: document.getElementById("decksRemaining"),
  penetrationStatus: document.getElementById("penetrationStatus"),
  insuranceStatus: document.getElementById("insuranceStatus"),
  surrenderStatus: document.getElementById("surrenderStatus"),
  pairSignal: document.getElementById("pairSignal"),
  rummySignal: document.getElementById("rummySignal"),
  luckySignal: document.getElementById("luckySignal"),
  bookStrategy: document.getElementById("bookStrategy"),
  perfectStrategy: document.getElementById("perfectStrategy"),
  cardGrid: document.getElementById("cardGrid"),
  quickSections: document.getElementById("quickSections"),
  burnPile: document.getElementById("burnPile"),
  resetShoe: document.getElementById("resetShoe"),
  undoLastCard: document.getElementById("undoLastCard"),
  surrender: document.getElementById("surrender"),
  insuranceAllowed: document.getElementById("insuranceAllowed"),
  h17: document.getElementById("h17"),
  das: document.getElementById("das"),
  doubleAllowed: document.getElementById("doubleAllowed"),
  payout: document.getElementById("payout"),
  splitsAllowed: document.getElementById("splitsAllowed"),
};

function totalCards() {
  return Number(els.deckCount.value) * 52;
}

function resetShoe() {
  state.runningCount = 0;
  state.cardsSeen = 0;
  state.burnPile = [];
  state.perCardRemaining = {};
  for (const suit of SUIT_KEYS) {
    for (const rank of RANKS) {
      state.perCardRemaining[`${rank}${suit}`] = Number(els.deckCount.value);
    }
  }
  render();
}

function cardsRemaining() {
  return Object.values(state.perCardRemaining).reduce((a, b) => a + b, 0);
}

function trueCount() {
  const decksLeft = Math.max(cardsRemaining() / 52, 0.25);
  return state.runningCount / decksLeft;
}

function removeCard(rank, suitKey, source) {
  const key = `${rank}${suitKey}`;
  if (!state.perCardRemaining[key]) return;
  state.perCardRemaining[key] -= 1;
  state.runningCount += HI_OPT_II[rank];
  state.cardsSeen += 1;
  state.burnPile.unshift({ key, source });
  render();
}

function undoLastCard() {
  const lastCard = state.burnPile.shift();
  if (!lastCard) return;
  const rank = lastCard.key.slice(0, -1);
  state.perCardRemaining[lastCard.key] += 1;
  state.runningCount -= HI_OPT_II[rank];
  state.cardsSeen = Math.max(0, state.cardsSeen - 1);
  render();
}

function recommendStrategies(tc, penetrationPct) {
  const rulesSuffix = `${els.h17.checked ? "H17" : "S17"}, ${els.das.checked ? "DAS" : "No DAS"}, payout ${els.payout.value}`;
  if (tc >= 3) {
    els.bookStrategy.textContent = `Book: Press advantage bets; use index deviations (${rulesSuffix}).`;
    els.perfectStrategy.textContent = `Perfect: Max edge spots${els.doubleAllowed.checked ? ", including high-EV doubles" : ""}, and prioritize side-bets when suited patterns remain rich.`;
    return;
  }
  if (tc >= 1) {
    els.bookStrategy.textContent = `Book: Slight bet increase, normal deviations only (${rulesSuffix}).`;
    els.perfectStrategy.textContent = `Perfect: Selective bet ramp; avoid weak side-bet exposure${Number(els.splitsAllowed.value) > 1 ? ", preserve split flexibility" : ""}.`;
    return;
  }
  els.bookStrategy.textContent = `Book: Flat/minimum bets and strict basic strategy (${rulesSuffix}).`;
  els.perfectStrategy.textContent = penetrationPct > 65 ? "Perfect: Wait for stronger count swings before increasing risk." : "Perfect: Stay conservative until deeper shoe information is available.";
}

function combinations(n, k) {
  if (k < 0 || n < k) return 0;
  if (k === 0 || n === k) return 1;
  if (k === 1) return n;
  if (k === 2) return (n * (n - 1)) / 2;
  return (n * (n - 1) * (n - 2)) / 6;
}

function rankValue(rank) {
  if (rank === "A") return 1;
  if (["10", "J", "Q", "K"].includes(rank)) return 10;
  return Number(rank);
}

function updateSignals() {
  const remaining = cardsRemaining();
  const tc = trueCount();
  const penetrationPct = ((totalCards() - remaining) / totalCards()) * 100;
  const threshold = Number(els.penetrationAlert.value);

  els.runningCount.textContent = String(state.runningCount);
  els.trueCount.textContent = tc.toFixed(2);
  els.cardsRemaining.textContent = String(remaining);
  els.decksRemaining.textContent = (remaining / 52).toFixed(2);

  els.penetrationStatus.className = penetrationPct >= threshold ? "good" : "warn";
  els.penetrationStatus.textContent = `Shoe penetration: ${penetrationPct.toFixed(1)}% (alert at ${threshold}%).`;

  if (els.insuranceAllowed.checked) {
    const insuranceGood = tc >= 3;
    els.insuranceStatus.className = insuranceGood ? "good" : "bad";
    els.insuranceStatus.textContent = insuranceGood ? "Insurance indicator: favorable." : "Insurance indicator: avoid for now.";
  } else {
    els.insuranceStatus.className = "warn";
    els.insuranceStatus.textContent = "Insurance disabled in rules.";
  }

  if (els.surrender.checked) {
    const surrenderGood = tc >= 4;
    els.surrenderStatus.className = surrenderGood ? "good" : "warn";
    els.surrenderStatus.textContent = surrenderGood ? "Surrender indicator: high-value surrender spots likely." : "Surrender indicator: use only standard basic-strategy spots.";
  } else {
    els.surrenderStatus.className = "warn";
    els.surrenderStatus.textContent = "Surrender disabled in rules.";
  }

  const rankTotals = Object.fromEntries(RANKS.map((r) => [r, 0]));
  for (const suit of SUIT_KEYS) {
    for (const rank of RANKS) rankTotals[rank] += state.perCardRemaining[`${rank}${suit}`];
  }
  const topPairRank = Object.entries(rankTotals).sort((a, b) => b[1] - a[1])[0];
  els.pairSignal.textContent = `Pairs signal: strongest remaining pair rank is ${topPairRank[0]} (${topPairRank[1]} cards left).`;

  const rummyRuns = [
    ["6", "7", "8"],
    ["7", "8", "9"],
    ["8", "9", "10"],
  ];
  let bestRun = { label: "6-7-8", score: 0 };
  for (const run of rummyRuns) {
    let score = 0;
    for (const suit of SUIT_KEYS) {
      score += Math.min(
        state.perCardRemaining[`${run[0]}${suit}`],
        state.perCardRemaining[`${run[1]}${suit}`],
        state.perCardRemaining[`${run[2]}${suit}`]
      );
    }
    if (score > bestRun.score) bestRun = { label: run.join("-"), score };
  }
  els.rummySignal.textContent = `Rummy signal: best suited run ${bestRun.label} has ${bestRun.score} live combinations.`;

  const luckyTotals = { 19: 0, 20: 0, 21: 0 };
  for (const suit of SUIT_KEYS) {
    for (let i = 0; i < RANKS.length; i++) {
      for (let j = i; j < RANKS.length; j++) {
        for (let k = j; k < RANKS.length; k++) {
          const sum = rankValue(RANKS[i]) + rankValue(RANKS[j]) + rankValue(RANKS[k]);
          if (!(sum in luckyTotals)) continue;
          const counts = {};
          counts[RANKS[i]] = (counts[RANKS[i]] || 0) + 1;
          counts[RANKS[j]] = (counts[RANKS[j]] || 0) + 1;
          counts[RANKS[k]] = (counts[RANKS[k]] || 0) + 1;
          let ways = 1;
          for (const [rank, needed] of Object.entries(counts)) {
            ways *= combinations(state.perCardRemaining[`${rank}${suit}`], needed);
          }
          luckyTotals[sum] += ways;
        }
      }
    }
  }
  els.luckySignal.textContent = `Lucky Trinity signal: 19=${luckyTotals[19]}, 20=${luckyTotals[20]}, 21=${luckyTotals[21]} suited 3-card combinations still live.`;

  recommendStrategies(tc, penetrationPct);
}

function renderBurnPile() {
  els.burnPile.innerHTML = "";
  for (const item of state.burnPile.slice(0, 250)) {
    const li = document.createElement("li");
    const suit = SUITS[SUIT_KEYS.indexOf(item.key.slice(-1))];
    li.textContent = `${item.key.slice(0, -1)}${suit} • ${item.source}`;
    els.burnPile.append(li);
  }
}

function renderCards() {
  for (const node of els.cardGrid.querySelectorAll("[data-key]")) {
    const key = node.dataset.key;
    node.querySelector("small").textContent = `${state.perCardRemaining[key]} left`;
    node.disabled = state.perCardRemaining[key] === 0;
  }
}

function render() {
  els.undoLastCard.disabled = state.burnPile.length === 0;
  renderCards();
  renderBurnPile();
  updateSignals();
}

function createCardGrid() {
  els.cardGrid.innerHTML = "";
  for (let s = 0; s < SUITS.length; s++) {
    const group = document.createElement("div");
    group.className = "suit-group";

    const heading = document.createElement("h3");
    heading.textContent = `Suit ${SUITS[s]}`;
    group.append(heading);

    const cards = document.createElement("div");
    cards.className = "suit-cards";
    for (const rank of RANKS) {
      const key = `${rank}${SUIT_KEYS[s]}`;
      const button = document.createElement("button");
      button.className = "card-btn";
      button.dataset.key = key;
      button.innerHTML = `<strong>${rank}${SUITS[s]}</strong><small></small>`;
      button.addEventListener("click", () => removeCard(rank, SUIT_KEYS[s], "Suit Tap"));
      cards.append(button);
    }
    group.append(cards);
    els.cardGrid.append(group);
  }
}

function createQuickSections() {
  const sections = ["Player Cards", "Dealer Cards", "Other Players"];
  els.quickSections.innerHTML = "";

  for (const section of sections) {
    const wrapper = document.createElement("div");
    wrapper.className = "quick-wrap";

    const title = document.createElement("strong");
    title.textContent = section;
    wrapper.append(title);

    const suitRow = document.createElement("div");
    suitRow.className = "quick-row suit-column";
    const rankRow = document.createElement("div");
    rankRow.className = "quick-row rank-grid";
    let selectedSuit = "S";

    SUITS.forEach((suit, i) => {
      const btn = document.createElement("button");
      btn.textContent = suit;
      if (i === 0) btn.classList.add("good");
      btn.addEventListener("click", () => {
        selectedSuit = SUIT_KEYS[i];
        for (const b of suitRow.querySelectorAll("button")) b.classList.remove("good");
        btn.classList.add("good");
      });
      suitRow.append(btn);
    });

    RANKS.forEach((rank) => {
      const btn = document.createElement("button");
      btn.textContent = rank;
      btn.addEventListener("click", () => removeCard(rank, selectedSuit, section));
      rankRow.append(btn);
    });

    wrapper.append(suitRow, rankRow);
    els.quickSections.append(wrapper);
  }
}

createCardGrid();
createQuickSections();
els.resetShoe.addEventListener("click", resetShoe);
els.undoLastCard.addEventListener("click", undoLastCard);
["deckCount", "penetrationAlert", "surrender", "insuranceAllowed", "h17", "das", "doubleAllowed", "payout", "splitsAllowed"].forEach((id) => {
  document.getElementById(id).addEventListener("change", () => {
    if (id === "deckCount") resetShoe();
    else render();
  });
});

resetShoe();
