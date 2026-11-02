// THE APP'S OWN FILE: the frame around signed-in pages, read by the core's (app) layout in place
// of its own header and footer (a hand-made change to that layout, see CLAUDE.md). Remember's is
// a sidebar on a computer and a tab bar on a phone (Frame.svelte). Null keeps the core's.
// Kept apart from shell.ts, which the session code imports: this one only the layout reads.

import type { Component, Snippet } from 'svelte';
import type { User } from '#lib/api/index.ts';
import Frame from './Frame.svelte';

export const appFrame: Component<{ user: User; children: Snippet }> | null = Frame;
