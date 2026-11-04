// The daily reminder: saving a time, and asking this device for permission to show it. Today's
// prompt and Settings do the same thing, so they share this.

import { toast } from '#lib/components/ui/toast.svelte.ts';
import { t } from '#lib/i18n/index.svelte.ts';
import { pushOn, type PushState } from '#lib/push.ts';
import { saveSettings } from '#lib/app/store.svelte.ts';

/** Saves the reminder (null: none), turning notifications on here when it can. The new push state. */
export async function setReminder(
  at: string | null,
  vapid: string | null,
  state: PushState,
): Promise<PushState> {
  let push = state;
  if (at && vapid && push !== 'on' && push !== 'install' && push !== 'unsupported') {
    try {
      push = await pushOn(vapid);
    } catch (e) {
      toast(e instanceof Error ? e.message : t('Notifications couldn’t be turned on.'), { tone: 'error' });
    }
  }
  await saveSettings({ reminderAt: at });
  return push;
}
