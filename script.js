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
  layout: document.querySelector(".layout"),
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
  sideBetBest: document.getElementById("sideBetBest"),
  bookStrategy: document.getElementById("bookStrategy"),
  perfectStrategy: document.getElementById("perfectStrategy"),
  cardGrid: document.getElementById("cardGrid"),
  quickSections: document.getElementById("quickSections"),
  rulesSidebar: document.getElementById("rulesSidebar"),
  toggleSidebar: document.getElementById("toggleSidebar"),
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
  const canSplit = Number(els.splitsAllowed.value) > 0;
  const canDouble = els.doubleAllowed.checked;
  const canSurrender = els.surrender.checked;
  let bookAction = "Stand";
  let perfectAction = "Stand";

  if (tc <= -2 || penetrationPct < 35) {
    bookAction = "Hit";
  } else if (tc >= 3 && canSplit) {
    bookAction = "Split";
  } else if (tc >= 1 && canDouble) {
    bookAction = "Double";
  }

  if (tc <= -3 || penetrationPct < 30) {
    perfectAction = "Hit";
  } else if (tc >= 4 && canSurrender) {
    perfectAction = "Surrender";
  } else if (tc >= 2 && canSplit) {
    perfectAction = "Split";
  } else if (tc >= 1 && canDouble) {
    perfectAction = "Double";
  }

  if (tc >= 5 && !canSplit && !canDouble) {
    bookAction = "Stand";
    perfectAction = canSurrender ? "Surrender" : "Stand";
  }

  if (tc <= -1 && !canDouble && !canSplit) {
    bookAction = "Hit";
    perfectAction = "Hit";
  }

  els.bookStrategy.textContent = bookAction;
  els.perfectStrategy.textContent = perfectAction;
}

function toggleSidebar() {
  const collapsed = els.layout.classList.toggle("sidebar-collapsed");
  els.rulesSidebar.classList.toggle("collapsed", collapsed);
  els.toggleSidebar.setAttribute("aria-expanded", String(!collapsed));
  els.toggleSidebar.textContent = collapsed ? "Show Sidebar" : "Hide Sidebar";
}

function setQuickSuitSelection(suitRow, activeBtn) {
  for (const b of suitRow.querySelectorAll("button")) b.classList.remove("good");
  activeBtn.classList.add("good");
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

function percent(value) {
  return `${(value * 100).toFixed(2)}%`;
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
  const pairWays = Object.values(rankTotals).reduce((sum, count) => sum + combinations(count, 2), 0);
  const totalTwoCardHands = combinations(remaining, 2);
  const pairProbability = totalTwoCardHands > 0 ? pairWays / totalTwoCardHands : 0;
  els.pairSignal.textContent = `Pairs hit chance: ${percent(pairProbability)} (${pairWays} favorable two-card combinations).`;

  const rummyRuns = [
    ["6", "7", "8"],
    ["7", "8", "9"],
    ["8", "9", "10"],
  ];
  let bestRun = { label: "6-7-8", score: 0 };
  let rummyWays = 0;
  for (const run of rummyRuns) {
    let score = 0;
    for (const suit of SUIT_KEYS) {
      const waysForSuit =
        state.perCardRemaining[`${run[0]}${suit}`] *
        state.perCardRemaining[`${run[1]}${suit}`] *
        state.perCardRemaining[`${run[2]}${suit}`];
      score += Math.min(
        state.perCardRemaining[`${run[0]}${suit}`],
        state.perCardRemaining[`${run[1]}${suit}`],
        state.perCardRemaining[`${run[2]}${suit}`]
      );
      rummyWays += waysForSuit;
    }
    if (score > bestRun.score) bestRun = { label: run.join("-"), score };
  }
  const totalThreeCardHands = combinations(remaining, 3);
  const rummyProbability = totalThreeCardHands > 0 ? rummyWays / totalThreeCardHands : 0;
  els.rummySignal.textContent = `Rummy hit chance: ${percent(rummyProbability)} (best live suited run ${bestRun.label}).`;

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
  const luckyWays = luckyTotals[19] + luckyTotals[20] + luckyTotals[21];
  const luckyProbability = totalThreeCardHands > 0 ? luckyWays / totalThreeCardHands : 0;
  els.luckySignal.textContent = `Lucky Trinity hit chance: ${percent(luckyProbability)} (19=${luckyTotals[19]}, 20=${luckyTotals[20]}, 21=${luckyTotals[21]}).`;

  const sideBetProbabilities = [
    { label: "Pairs", probability: pairProbability },
    { label: "Rummy", probability: rummyProbability },
    { label: "Lucky Trinity", probability: luckyProbability },
  ];
  sideBetProbabilities.sort((a, b) => b.probability - a.probability);
  const bestSideBet = sideBetProbabilities[0];
  els.sideBetBest.textContent = `Multi-count side-bet edge: ${bestSideBet.label} is highest right now at ${percent(bestSideBet.probability)}.`;

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
        setQuickSuitSelection(suitRow, btn);
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
els.toggleSidebar.addEventListener("click", toggleSidebar);
["deckCount", "penetrationAlert", "surrender", "insuranceAllowed", "h17", "das", "doubleAllowed", "payout", "splitsAllowed"].forEach((id) => {
  document.getElementById(id).addEventListener("change", () => {
    if (id === "deckCount") resetShoe();
    else render();
  });
});

resetShoe();
