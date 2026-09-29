@AGENTS.md

# Design rule: Claude Design drives the design

The *Manali Apps Design System* in Claude Design (claude.ai/design, project `c4ab5686-6494-48a6-9809-f92d21cb331d`) is the source of truth for how this site looks, and it must always hold the latest design.

- **New UI starts in Claude Design.** Ask its agent for the design (through Claude in Chrome when an agent does it), then port what it made into `src/styles/` and the components. Don't design in code or in a separate artifact first.
- **Changes made in code go back to Claude Design.** A bug fix or phone tweak that changes what people see gets described to Claude Design right after it ships, so the system matches production.
- **Phone and laptop both.** Every design covers 390px and 1280px, dark (the near-black default) and light.
