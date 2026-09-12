# Browser provider boundary

ASIDE-GPT uses a provider abstraction to keep workflow policy separate from browser execution. The active default is the host product’s native Work browser. The abstraction is descriptive: it does not create a network client or imply that Work exposes a callable public browser API.

| Provider | Active use | PC required | Public execution API verified | Decision |
| --- | --- | ---: | ---: | --- |
| `work-native` | Default logical route selected by Work | No | Not needed for this plugin | Use when browser interaction is needed |
| `aside-cloud` | None | Unknown | No | Optional future provider only; no adapter or endpoint |
| `future-provider` | None | Unknown | No | Reserved for a documented hosted runtime |

Connected apps are a separate executor class. They are selected by Work when the user has installed and authorized the relevant integration; they are not represented as a fake browser provider.

See [docs/PROVIDERS.md](../docs/PROVIDERS.md) and [docs/ASIDE_RESEARCH.md](../docs/ASIDE_RESEARCH.md).
