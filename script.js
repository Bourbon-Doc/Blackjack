const SUITS = ["♠", "♥", "♦", "♣"];
const SUIT_KEYS = ["S", "H", "D", "C"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const HI_OPT_II = { A: 0, "2": 1, "3": 1, "4": 2, "5": 2, "6": 1, "7": 1, "8": 0, "9": 0, "10": -2, J: -2, Q: -2, K: -2 };

const state = {
  runningCount: 0,
  cardsSeen: 0,
  burnPile: [],
  perCardRemaining: {},
  playerHand: [],
  dealerHand: [],
};

const els = {
  deckCount: document.getElementById("deckCount"),
  penetrationAlert: document.getElementById("penetrationAlert"),
  layout: document.querySelector(".layout"),
  runningCount: document.getElementById("runningCount"),
  trueCount: document.getElementById("trueCount"),
  cardsRemaining: document.getElementById("cardsRemaining"),
  decksRemaining: document.getElementById("decksRemaining"),
  penetrationHeader: document.getElementById("penetrationHeader"),
  insuranceStatus: document.getElementById("insuranceStatus"),
  surrenderStatus: document.getElementById("surrenderStatus"),
  pairSignal: document.getElementById("pairSignal"),
  rummySignal: document.getElementById("rummySignal"),
  luckySignal: document.getElementById("luckySignal"),
  sideBetBest: document.getElementById("sideBetBest"),
  bookStrategy: document.getElementById("bookStrategy"),
  perfectStrategy: document.getElementById("perfectStrategy"),
  playerHandIndicator: document.getElementById("playerHandIndicator"),
  dealerHandIndicator: document.getElementById("dealerHandIndicator"),
  cardGrid: document.getElementById("cardGrid"),
  quickSections: document.getElementById("quickSections"),
  rulesSidebar: document.getElementById("rulesSidebar"),
  toggleSidebar: document.getElementById("toggleSidebar"),
  burnPile: document.getElementById("burnPile"),
  resetShoe: document.getElementById("resetShoe"),
  undoLastCard: document.getElementById("undoLastCard"),
  undoQuickCard: document.getElementById("undoQuickCard"),
  nextHand: document.getElementById("nextHand"),
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
  state.playerHand = [];
  state.dealerHand = [];
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
  if (source === "Player Cards") state.playerHand.push(key);
  if (source === "Dealer Cards") state.dealerHand.push(key);
  render();
}

function undoLastCard() {
  const lastCard = state.burnPile.shift();
  if (!lastCard) return;
  const rank = lastCard.key.slice(0, -1);
  state.perCardRemaining[lastCard.key] += 1;
  state.runningCount -= HI_OPT_II[rank];
  state.cardsSeen = Math.max(0, state.cardsSeen - 1);
  if (lastCard.source === "Player Cards" && state.playerHand.length > 0) state.playerHand.pop();
  if (lastCard.source === "Dealer Cards" && state.dealerHand.length > 0) state.dealerHand.pop();
  render();
}

function nextHand() {
  state.playerHand = [];
  state.dealerHand = [];
  render();
}

function dealerUpcardValue() {
  if (state.dealerHand.length === 0) return null;
  const rank = state.dealerHand[0].slice(0, -1);
  if (["10", "J", "Q", "K"].includes(rank)) return 10;
  if (rank === "A") return 11;
  return Number(rank);
}

function handSummary(cards) {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    const rank = card.slice(0, -1);
    if (rank === "A") {
      total += 1;
      aces += 1;
    } else if (["10", "J", "Q", "K"].includes(rank)) {
      total += 10;
    } else {
      total += Number(rank);
    }
  }
  let bestTotal = total;
  let isSoft = false;
  if (aces > 0 && total + 10 <= 21) {
    bestTotal = total + 10;
    isSoft = true;
  }
  const hardTotal = total;
  const firstRank = cards[0]?.slice(0, -1);
  const secondRank = cards[1]?.slice(0, -1);
  const rankValue = (rank) => (rank === "A" ? 11 : ["10", "J", "Q", "K"].includes(rank) ? 10 : Number(rank));
  const isPair = cards.length === 2 && firstRank && secondRank && rankValue(firstRank) === rankValue(secondRank);
  const pairValue = isPair ? rankValue(firstRank) : null;
  return { bestTotal, hardTotal, isSoft, isPair, pairValue, cards };
}

function recommendBookStrategy(tc) {
  const canSplit = Number(els.splitsAllowed.value) > 0;
  const canDouble = els.doubleAllowed.checked;
  const canSurrender = els.surrender.checked;
  const dealerUp = dealerUpcardValue();
  const summary = handSummary(state.playerHand);
  if (state.playerHand.length === 0 || dealerUp === null) return "Waiting for player/dealer cards";
  if (summary.bestTotal > 21) return "Bust";
  if (summary.bestTotal === 21 && state.playerHand.length === 2) return "Stand (Blackjack)";
  if (summary.isPair && canSplit) {
    if ([11, 8].includes(summary.pairValue)) return "Split";
    if (summary.pairValue === 9) return [7, 10, 11].includes(dealerUp) ? "Stand" : "Split";
    if ([2, 3, 7].includes(summary.pairValue) && dealerUp >= 2 && dealerUp <= 7) return "Split";
    if (summary.pairValue === 6 && dealerUp >= 2 && dealerUp <= 6) return "Split";
    if (summary.pairValue === 4 && dealerUp >= 5 && dealerUp <= 6 && canDouble) return "Split";
  }
  if (summary.isSoft) {
    if (summary.bestTotal >= 19) return "Stand";
    if (summary.bestTotal === 18) {
      if (canDouble && dealerUp >= 3 && dealerUp <= 6) return "Double";
      return dealerUp >= 9 || dealerUp === 11 ? "Hit" : "Stand";
    }
    if (canDouble && summary.bestTotal >= 15 && summary.bestTotal <= 17 && dealerUp >= 4 && dealerUp <= 6) return "Double";
    return "Hit";
  }
  if (summary.bestTotal >= 17) return "Stand";
  if (summary.bestTotal >= 13 && summary.bestTotal <= 16) {
    if (canSurrender && summary.bestTotal === 16 && [10, 11].includes(dealerUp)) return "Surrender";
    return dealerUp >= 2 && dealerUp <= 6 ? "Stand" : "Hit";
  }
  if (summary.bestTotal === 12) return dealerUp >= 4 && dealerUp <= 6 ? "Stand" : "Hit";
  if (summary.bestTotal === 11) return canDouble ? "Double" : "Hit";
  if (summary.bestTotal === 10) return canDouble && dealerUp <= 9 ? "Double" : "Hit";
  if (summary.bestTotal === 9) return canDouble && dealerUp >= 3 && dealerUp <= 6 ? "Double" : "Hit";
  return "Hit";
}

function recommendPerfectStrategy(tc) {
  const canDouble = els.doubleAllowed.checked;
  const canSurrender = els.surrender.checked;
  const dealerUp = dealerUpcardValue();
  const summary = handSummary(state.playerHand);
  if (state.playerHand.length === 0 || dealerUp === null) return "Waiting for player/dealer cards";
  if (summary.bestTotal > 21) return "Bust";
  if (summary.bestTotal === 21 && state.playerHand.length === 2) return "Stand (Blackjack)";
  if (!summary.isSoft && !summary.isPair) {
    if (summary.bestTotal === 16 && dealerUp === 10) {
      if (canSurrender && tc >= 0) return "Surrender";
      return tc >= 0 ? "Stand" : "Hit";
    }
    if (summary.bestTotal === 15 && dealerUp === 10) {
      if (canSurrender && tc >= 4) return "Surrender";
      return tc >= 4 ? "Stand" : "Hit";
    }
    if (summary.bestTotal === 12 && dealerUp === 3 && tc >= 2) return "Stand";
    if (summary.bestTotal === 12 && dealerUp === 2 && tc >= 3) return "Stand";
    if (summary.bestTotal === 10 && dealerUp === 10 && canDouble && tc >= 4) return "Double";
    if (summary.bestTotal === 11 && dealerUp === 11 && canDouble && tc >= 1) return "Double";
  }
  const baseline = recommendBookStrategy(tc);
  if (baseline === "Hit" && tc <= -3 && summary.bestTotal >= 14 && !summary.isSoft) return "Hit";
  return baseline;
}

function cardLabelFromKey(key) {
  const rank = key.slice(0, -1);
  const suit = SUITS[SUIT_KEYS.indexOf(key.slice(-1))];
  return `${rank}${suit}`;
}

function formatHandIndicator(title, cards) {
  if (cards.length === 0) return `${title}: —`;
  const summary = handSummary(cards);
  const cardsText = cards.map(cardLabelFromKey).join(" ");
  return `${title}: ${cardsText} (${summary.bestTotal})`;
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
  els.penetrationHeader.className = penetrationPct >= threshold ? "good" : "warn";
  els.penetrationHeader.textContent = `${penetrationPct.toFixed(1)}%`;

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

  const bookAction = recommendBookStrategy(tc);
  const perfectAction = recommendPerfectStrategy(tc);
  els.bookStrategy.textContent = bookAction;
  els.perfectStrategy.textContent = perfectAction;
  els.playerHandIndicator.textContent = formatHandIndicator("Player", state.playerHand);
  els.dealerHandIndicator.textContent = formatHandIndicator("Dealer", state.dealerHand);

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
  if (els.undoQuickCard) els.undoQuickCard.disabled = state.burnPile.length === 0;
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
if (els.undoQuickCard) els.undoQuickCard.addEventListener("click", undoLastCard);
if (els.nextHand) els.nextHand.addEventListener("click", nextHand);
els.toggleSidebar.addEventListener("click", toggleSidebar);
["deckCount", "penetrationAlert", "surrender", "insuranceAllowed", "h17", "das", "doubleAllowed", "payout", "splitsAllowed"].forEach((id) => {
  document.getElementById(id).addEventListener("change", () => {
    if (id === "deckCount") resetShoe();
    else render();
  });
});

resetShoe();
