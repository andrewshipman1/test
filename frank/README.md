# Frank

Frank is an AI deal-partner for Manhattan real estate developers. You describe what you're looking for in plain language — an assemblage opportunity near a rezoning, a vacant lot with unused FAR, an owner's full portfolio — and Frank pulls live NYC public data, runs it through deterministic scoring and pro forma math, and answers with real numbers, not a paraphrase of a hunch.

## What it does

Frank is a chat interface backed by 10 tools that query New York City's own open data: PLUTO tax lot records, HPD violations, DOB permits, DOF sales comps, rent stabilization registries, and LPC historic district boundaries. Ask it to find underbuilt lots in a neighborhood, check whether a building has open Class C violations, run a condo development pro forma on a specific address, or score a multi-lot assemblage, and it dispatches the right tools, pulls the data, and reasons over the result.

## Why it's built this way

The core design decision is a strict boundary: the model owns retrieval and explanation, deterministic code owns every number.

Claude decides which tools to call and narrates the result, but it never invents a score, a buildable square footage, or a pro forma output — those come from pure functions running on real PLUTO/HPD/DOB/DOF data, so the same inputs always produce the same answer. The scoring logic (opportunity score, assemblage score, land residual) is ordinary rule-based arithmetic, not a model call, which means it's auditable and doesn't drift between runs. The model's job is judgment and language; the numbers underneath it are code you could hand to an underwriter.

## Architecture

- **Tool-use loop** — hand-rolled, not built on an agent framework. The client posts to a Vercel serverless function, which proxies to the Anthropic API and streams the response back over SSE; the client parses that stream itself and re-invokes the loop with tool results until the model stops calling tools or a hard ceiling of 5 tool-calling rounds is hit.
- **Tools** — 10 tools (property search, property detail, pro forma, rent stabilization check, violations, permits, market comps, historic district check, assemblage scoring, owner portfolio), each with a JSON Schema on its input enforced by the Claude API. When a model turn calls multiple independent tools, they execute concurrently rather than one at a time.
- **Data layer** — every tool hits live NYC Open Data (Socrata) endpoints directly. Nothing is mocked or fixture-backed.
- **Scoring & pro forma** — deterministic, pure-function code, entirely separate from the LLM call path.
- **Persistence** — conversation history, tool calls, saved properties, and deal notes are stored in the browser's `localStorage`. A Supabase client and schema exist in the codebase for a future multi-device backend but aren't wired into the app yet — everything today is local to your browser.

## Stack

React, Vite, MapLibre GL (via react-map-gl), Vercel (serverless function + static hosting).

## Things I'd change

- Wire up the Supabase schema that already exists so conversations and saved properties persist across devices instead of living only in `localStorage`.
- Add runtime validation on tool inputs. Right now malformed arguments from the model (a bad BBL, for instance) fail downstream rather than being rejected with a clear error.
- Expose the ACRIS deed/mortgage/lender lookup that already powers the property drawer in the UI as an agent tool — right now the model can't see it, only the human can.
- Surface the turn-ceiling failure mode to the user. If the loop hits its 5-round cap, it currently ends silently instead of telling the user it ran out of room.
- Extend past Manhattan. The data layer and scoring are Manhattan-only right now; the other four boroughs are the obvious next step.
