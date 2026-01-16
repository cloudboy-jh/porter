import "clsx";
import { g as goto } from "../../../chunks/client.js";
import { S as SettingsModal } from "../../../chunks/SettingsModal.js";
import { B as Button } from "../../../chunks/button.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const close = () => goto();
    $$renderer2.push(`<header class="flex flex-wrap items-center justify-between gap-4"><div class="space-y-1"><p class="text-xs text-muted-foreground">Porter › Settings</p> <h1 class="text-2xl font-semibold text-foreground">Settings</h1> <p class="text-sm text-muted-foreground">Tune execution mode, agents, and connections.</p></div> <div class="flex items-center gap-2">`);
    Button($$renderer2, {
      variant: "secondary",
      type: "button",
      onclick: close,
      children: ($$renderer3) => {
        $$renderer3.push(`<!---->Back to Dashboard`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></div></header> `);
    SettingsModal($$renderer2, { open: true });
    $$renderer2.push(`<!---->`);
  });
}
export {
  _page as default
};
