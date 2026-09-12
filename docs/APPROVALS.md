# Approval boundaries

ASIDE-GPT uses three task classes:

| Class | Examples | Default boundary |
| --- | --- | --- |
| `READ` | search, inspect, compare, status check, collect values | Continue when safe; verify before reporting |
| `WRITE` | fill a form, edit a document, change a setting, add to cart, save a draft | Pause before the first remote state change |
| `EXTERNAL_EFFECT` | send, publish, submit, book, purchase, pay, delete, transfer, change account access | Pause immediately before the consequential action and require explicit confirmation |

The boundary is based on the proposed action, not merely the user’s first sentence. A read-only research task can become a write task if the user later asks to save or submit something. A connected app and the cloud browser follow the same policy.

At an approval pause, show the exact target, proposed action, important values, and likely consequence. If the target or consequence changed after planning, re-plan and ask again. A declined or missing confirmation must not be treated as approval.

The host product’s confirmation UI and safety policy remain authoritative. ASIDE-GPT does not weaken, simulate, or bypass them.
