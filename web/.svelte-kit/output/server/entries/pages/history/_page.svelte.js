import { a6 as ensure_array_like } from "../../../chunks/index.js";
import { C as Card, a as Card_content, T as Table, b as Table_header, c as Table_row, d as Table_head, e as Table_body, f as Table_cell, B as Badge } from "../../../chunks/table-row.js";
import { B as Button } from "../../../chunks/button.js";
import "clsx";
import { P as Plus } from "../../../chunks/plus.js";
import { e as escape_html } from "../../../chunks/context.js";
function _page($$renderer) {
  let filteredHistoryTasks;
  const historyStats = [
    { label: "Completed", value: "128" },
    { label: "Success Rate", value: "92%" },
    { label: "Avg Time", value: "11m" }
  ];
  const filters = ["All", "Success", "Failed"];
  const filterMap = { Success: "success", Failed: "failed" };
  let activeFilter = "All";
  let historyTasks = [
    {
      id: "history-140",
      status: "success",
      statusLabel: "DONE",
      title: "Improve queue retry logic",
      repo: "porter",
      issue: "#140",
      agent: "aider",
      completed: "5m ago",
      pr: "#512"
    },
    {
      id: "history-98",
      status: "success",
      statusLabel: "DONE",
      title: "Refine agent detection hints",
      repo: "porter",
      issue: "#98",
      agent: "opencode",
      completed: "32m ago",
      pr: "#489"
    },
    {
      id: "history-77",
      status: "failed",
      statusLabel: "FAIL",
      title: "Refactor API gateway",
      repo: "core",
      issue: "#77",
      agent: "cursor",
      completed: "1h ago",
      pr: "—"
    },
    {
      id: "history-31",
      status: "success",
      statusLabel: "DONE",
      title: "Update onboarding email copy",
      repo: "onboard",
      issue: "#31",
      agent: "windsurf",
      completed: "2h ago",
      pr: "#402"
    }
  ];
  filteredHistoryTasks = activeFilter === "All" ? historyTasks : historyTasks.filter((task) => task.status === filterMap[activeFilter]);
  $$renderer.push(`<header class="flex flex-wrap items-center justify-between gap-4"><div class="space-y-1"><p class="text-xs text-muted-foreground">Porter › Task History</p> <h1 class="text-2xl font-semibold text-foreground">Task History</h1> <p class="text-sm text-muted-foreground">Review finished tasks and outcomes.</p></div> <div class="flex flex-wrap items-center gap-2">`);
  Button($$renderer, {
    variant: "secondary",
    type: "button",
    children: ($$renderer2) => {
      $$renderer2.push(`<!---->Export`);
    },
    $$slots: { default: true }
  });
  $$renderer.push(`<!----> `);
  Button($$renderer, {
    type: "button",
    children: ($$renderer2) => {
      Plus($$renderer2, { size: 16 });
      $$renderer2.push(`<!----> New Task`);
    },
    $$slots: { default: true }
  });
  $$renderer.push(`<!----></div></header> <section class="grid gap-3 sm:grid-cols-3"><!--[-->`);
  const each_array = ensure_array_like(historyStats);
  for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
    let stat = each_array[$$index];
    Card($$renderer, {
      children: ($$renderer2) => {
        Card_content($$renderer2, {
          class: "space-y-1 p-4",
          children: ($$renderer3) => {
            $$renderer3.push(`<div class="text-lg font-semibold">${escape_html(stat.value)}</div> <div class="text-xs text-muted-foreground">${escape_html(stat.label)}</div>`);
          },
          $$slots: { default: true }
        });
      },
      $$slots: { default: true }
    });
  }
  $$renderer.push(`<!--]--></section> <section class="flex flex-wrap gap-2"><!--[-->`);
  const each_array_1 = ensure_array_like(filters);
  for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
    let filter = each_array_1[$$index_1];
    Button($$renderer, {
      variant: filter === activeFilter ? "default" : "outline",
      size: "sm",
      onclick: () => activeFilter = filter,
      children: ($$renderer2) => {
        $$renderer2.push(`<!---->${escape_html(filter)}`);
      },
      $$slots: { default: true }
    });
  }
  $$renderer.push(`<!--]--></section> <section class="rounded-xl border border-border bg-card">`);
  Table($$renderer, {
    children: ($$renderer2) => {
      Table_header($$renderer2, {
        children: ($$renderer3) => {
          Table_row($$renderer3, {
            children: ($$renderer4) => {
              Table_head($$renderer4, {
                children: ($$renderer5) => {
                  $$renderer5.push(`<!---->Status`);
                },
                $$slots: { default: true }
              });
              $$renderer4.push(`<!----> `);
              Table_head($$renderer4, {
                children: ($$renderer5) => {
                  $$renderer5.push(`<!---->Task`);
                },
                $$slots: { default: true }
              });
              $$renderer4.push(`<!----> `);
              Table_head($$renderer4, {
                children: ($$renderer5) => {
                  $$renderer5.push(`<!---->Repository`);
                },
                $$slots: { default: true }
              });
              $$renderer4.push(`<!----> `);
              Table_head($$renderer4, {
                children: ($$renderer5) => {
                  $$renderer5.push(`<!---->Agent`);
                },
                $$slots: { default: true }
              });
              $$renderer4.push(`<!----> `);
              Table_head($$renderer4, {
                children: ($$renderer5) => {
                  $$renderer5.push(`<!---->Completed`);
                },
                $$slots: { default: true }
              });
              $$renderer4.push(`<!----> `);
              Table_head($$renderer4, {
                class: "text-right",
                children: ($$renderer5) => {
                  $$renderer5.push(`<!---->Actions`);
                },
                $$slots: { default: true }
              });
              $$renderer4.push(`<!---->`);
            },
            $$slots: { default: true }
          });
        },
        $$slots: { default: true }
      });
      $$renderer2.push(`<!----> `);
      Table_body($$renderer2, {
        children: ($$renderer3) => {
          $$renderer3.push(`<!--[-->`);
          const each_array_2 = ensure_array_like(filteredHistoryTasks);
          for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
            let task = each_array_2[$$index_2];
            Table_row($$renderer3, {
              children: ($$renderer4) => {
                Table_cell($$renderer4, {
                  children: ($$renderer5) => {
                    Badge($$renderer5, {
                      variant: task.status === "failed" ? "destructive" : "secondary",
                      children: ($$renderer6) => {
                        $$renderer6.push(`<!---->${escape_html(task.statusLabel)}`);
                      },
                      $$slots: { default: true }
                    });
                  },
                  $$slots: { default: true }
                });
                $$renderer4.push(`<!----> `);
                Table_cell($$renderer4, {
                  children: ($$renderer5) => {
                    $$renderer5.push(`<div class="font-medium">${escape_html(task.title)}</div> <div class="text-xs text-muted-foreground">Issue ${escape_html(task.issue)} · PR ${escape_html(task.pr)}</div>`);
                  },
                  $$slots: { default: true }
                });
                $$renderer4.push(`<!----> `);
                Table_cell($$renderer4, {
                  class: "text-muted-foreground",
                  children: ($$renderer5) => {
                    $$renderer5.push(`<!---->${escape_html(task.repo)}`);
                  },
                  $$slots: { default: true }
                });
                $$renderer4.push(`<!----> `);
                Table_cell($$renderer4, {
                  children: ($$renderer5) => {
                    Badge($$renderer5, {
                      variant: "outline",
                      class: "text-xs capitalize",
                      children: ($$renderer6) => {
                        $$renderer6.push(`<!---->${escape_html(task.agent)}`);
                      },
                      $$slots: { default: true }
                    });
                  },
                  $$slots: { default: true }
                });
                $$renderer4.push(`<!----> `);
                Table_cell($$renderer4, {
                  class: "text-xs text-muted-foreground",
                  children: ($$renderer5) => {
                    $$renderer5.push(`<!---->${escape_html(task.completed)}`);
                  },
                  $$slots: { default: true }
                });
                $$renderer4.push(`<!----> `);
                Table_cell($$renderer4, {
                  class: "text-right",
                  children: ($$renderer5) => {
                    Button($$renderer5, {
                      variant: "ghost",
                      size: "sm",
                      children: ($$renderer6) => {
                        $$renderer6.push(`<!---->View`);
                      },
                      $$slots: { default: true }
                    });
                  },
                  $$slots: { default: true }
                });
                $$renderer4.push(`<!---->`);
              },
              $$slots: { default: true }
            });
          }
          $$renderer3.push(`<!--]-->`);
        },
        $$slots: { default: true }
      });
      $$renderer2.push(`<!---->`);
    },
    $$slots: { default: true }
  });
  $$renderer.push(`<!----></section>`);
}
export {
  _page as default
};
