# Blackjack

Hi-Opt II real-time tap-to-count blackjack tracker with suit-aware side-bet support.

## Run locally

This project is a static site:

1. Open `/home/runner/work/Blackjack/Blackjack/index.html` in a browser, or
2. Serve the directory with any static file server.

## Features

- Hi-Opt II running and true count
- Sticky running-count header that remains visible while scrolling
- Rule toggles (DAS, surrender, dealer soft-17 behavior, double, insurance, payout, splits, decks 1-8)
- Left sidebar that can collapse out to the left for more table space
- Suit-specific card tap grid with remaining card counts per exact card
- Adjustable shoe penetration alert threshold
- Insurance and surrender indicator hints
- Side-bet tracker uses exact deck composition to show side-bet hit percentages and best current edge
- Burn card pile with card + source section history
- Undo button for the most recently added card
- Side-by-side quick tap lanes for player, dealer, and other players with larger tap buttons
