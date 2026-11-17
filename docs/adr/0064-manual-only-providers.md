# ADR-0064: A provider may require that a person chooses each post

- **Status:** Accepted
- **Date:** 2026-11-17
- **Deciders:** Frederik Schlentc
- **Area:** Providers, scheduling
- **Spec:** [Provider contract](../architecture/03-provider-contract.md), [Publishing pipeline](../architecture/05-publishing-pipeline.md)

## Context

Pinterest's developer guidelines (checked 2026-11-17) say: "if your app allows end users to schedule Pin publishing, the end user must choose each Pin to be published."

Three Kronaut jobs schedule posts that no person chose one by one: RSS feeds in queue mode, the evergreen fill, and recurring series. Each can target a Pinterest channel today. Until now a manifest could say what a provider accepts, but not who may send it.

## Decision

**A manifest may set `manualOnly: true`. Kronaut's jobs then never schedule a post to that provider's channels.**

- **RSS feeds:** a feed in queue mode can't have a manual-only channel; saving it fails with `channel_manual_only`. Draft mode stays allowed, because a person schedules each draft. At run time the job also skips such a channel in queue mode.
- **Evergreen:** the fill job leaves manual-only channels out of the pool. Marking a post evergreen still works for its other channels.
- **Recurring series:** scheduling or requesting approval with a repeat fails with `repeat_manual_only` when a destination is manual-only. The series job also refuses to schedule a clone to such a channel.
- **What stays allowed:** a person scheduling or queueing one post, CSV import (the person wrote each row and confirms the batch), and API grants, which act per post.
- **Channels list:** each channel carries `manualOnly`, so the web can explain the limit before the server rejects it.
- **First user:** `pinterest`.

## Options considered

- **Chosen:** the decision above.
- Rejected: documentation only. The docs already say it; nothing stops a feed or a series from doing it.
- Rejected: one check in `freeze` for every post a job created. A draft that an RSS feed created and a person then schedules would be blocked too, and `freeze` doesn't know who is acting.
- Rejected: blocking CSV import as well. Each row is a post the person wrote, and the import is confirmed by a person.

## Consequences

- A manual-only channel can't be filled from RSS queue mode, evergreen or a repeat. People who want that for Pinterest must schedule each Pin.
- Other providers with the same rule set one flag.
- Revisit when: a network's rule covers bulk import or API clients too, or Pinterest changes its guideline.
