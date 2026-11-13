<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## App architecture
- Load all NFL data through TanStack server functions; never download CSVs or query the database in browser code.
- Keep CSV filtering, name joining, and trend ranking in a tested pure module so import and scoring behavior remain deterministic.
- The public maintenance sync only accepts three validated seasons and fixed nflverse URLs, with an atomic five-minute per-season cooldown; it grants no user admin privileges or arbitrary data writes.
- Read public statistics using a server publishable client; privileged access is limited to bounded source sync, server-computed score saves, and validated AI report saves and generation claims, never caller-provided rows.
- Keep the percentile score model in a tested pure module; average tied ranks, neutral missing metrics, and offensive-snap games make cutoff results deterministic.
- Save score batches and computation status in one database transaction; Radar reads only the latest loaded cutoff and detail links preserve that cutoff.
- Use /player/$playerId as the canonical detail URL and retain /players/$playerId as a redirect so existing links keep working.
- Scouting AI runs only in a server function using stored cutoff data and validated structured output; append report versions, read the latest, and atomically throttle duplicate generation requests.
- Backtests evaluate saved week-10 scores in a tested pure module against weeks 11–18; count offensive-snap games and retain every eligible player in the baseline to avoid survivorship bias.
- Share route loading, retry, and missing-content states through router defaults and explicit data-route boundaries so navigation remains available during failures.
