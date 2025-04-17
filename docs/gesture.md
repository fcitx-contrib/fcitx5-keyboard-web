```mermaid
flowchart
  None([None]) -->|touchstart| Hit
  Hit -->|timeout| Pressing -->|touchend| LP([Long press])
  Pressing -->|touchmove| Moving[Moving highlight] -->|touchend| Action([Action])
  Pressing -->|interrupt| Interrupted -->|touchend| Dead([Dead])
  Moving -->|interrupt| Interrupted
  Hit -->|touchmove| Swiping/Sliding -->|touchend| Release
  Hit -->|touchend| CL([Down+Up])
  Hit -->|interrupt| Down -->|touchend| Up([Up])
```
* Moving + touchmove = Moving
* Swiping + touchmove = Swiping
* Hit + slight touchmove = Hit
* Due to double-tap, Shift is handled separately
