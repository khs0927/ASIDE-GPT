---
name: shopping
description: Use for product discovery, price comparison, shipping-condition comparison, and cart preparation without silently purchasing.
---

1. Clarify product identity, quantity, delivery location if relevant, budget, and comparison criteria from the user’s request.
2. Gather current offers with Work’s native cloud browser and use connected apps when they provide structured order or receipt data.
3. Normalize currency, taxes, shipping, seller, stock, return terms, subscription terms, and observed time before comparing.
4. Adding an item to a cart is a `WRITE` action; pause before it unless the user’s instruction and the host confirmation policy clearly permit it.
5. Checkout, purchase, payment, subscription, or order submission is an `EXTERNAL_EFFECT`; show the exact merchant, item, quantity, total, and delivery details, then request explicit confirmation immediately before submission.
6. Never request card details, account passwords, OTPs, or session cookies in chat. Use secure sign-in and payment UI supplied by Work or the merchant.
7. Report the comparison with direct product links, observed prices and conditions, timestamp, and any unavailable or unverified fields. Do not claim an order was placed without confirmation evidence.
