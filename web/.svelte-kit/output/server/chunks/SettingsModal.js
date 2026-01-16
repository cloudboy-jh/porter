import { Z as spread_props, $ as attributes, a1 as bind_props, _ as derived, a2 as props_id, a0 as clsx, a6 as ensure_array_like } from "./index.js";
import { C as Card, a as Card_content, B as Badge, T as Table, b as Table_header, c as Table_row, d as Table_head, e as Table_body, f as Table_cell } from "./table-row.js";
import { I as Icon, c as cn, B as Button } from "./button.js";
import "clsx";
import { j as styleToString, m as mergeProps, C as Context, a as attachRef, R as RovingFocusGroup, b as createBitsAttrs, w as watch, B as SPACE, G as boolToEmptyStrOrUndef, I as boolToStr, H as getAriaChecked, e as createId, o as noop, f as boxWith, N as Dialog$1, L as Portal, V as Dialog_title$1, O as Dialog_overlay$1, Q as Dialog_content$1, U as Dialog_close, X, W as Dialog_description$1 } from "./dialog-content.js";
import { e as escape_html } from "./context.js";
function Circle($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [["circle", { "cx": "12", "cy": "12", "r": "10" }]];
    Icon($$renderer2, spread_props([
      { name: "circle" },
      /**
       * @component @name Circle
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/circle
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      props,
      {
        iconNode,
        children: ($$renderer3) => {
          props.children?.($$renderer3);
          $$renderer3.push(`<!---->`);
        },
        $$slots: { default: true }
      }
    ]));
  });
}
const srOnlyStyles = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: "0",
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  borderWidth: "0",
  transform: "translateX(-100%)"
};
const srOnlyStylesString = styleToString(srOnlyStyles);
function Hidden_input($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { value = void 0, $$slots, $$events, ...restProps } = $$props;
    const mergedProps = mergeProps(restProps, {
      "aria-hidden": "true",
      tabindex: -1,
      style: srOnlyStylesString
    });
    if (mergedProps.type === "checkbox") {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<input${attributes({ ...mergedProps, value }, void 0, void 0, void 0, 4)}/>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<input${attributes({ value, ...mergedProps }, void 0, void 0, void 0, 4)}/>`);
    }
    $$renderer2.push(`<!--]-->`);
    bind_props($$props, { value });
  });
}
const radioGroupAttrs = createBitsAttrs({ component: "radio-group", parts: ["root", "item"] });
const RadioGroupRootContext = new Context("RadioGroup.Root");
class RadioGroupRootState {
  static create(opts) {
    return RadioGroupRootContext.set(new RadioGroupRootState(opts));
  }
  opts;
  #hasValue = derived(() => this.opts.value.current !== "");
  get hasValue() {
    return this.#hasValue();
  }
  set hasValue($$value) {
    return this.#hasValue($$value);
  }
  rovingFocusGroup;
  attachment;
  constructor(opts) {
    this.opts = opts;
    this.attachment = attachRef(this.opts.ref);
    this.rovingFocusGroup = new RovingFocusGroup({
      rootNode: this.opts.ref,
      candidateAttr: radioGroupAttrs.item,
      loop: this.opts.loop,
      orientation: this.opts.orientation
    });
  }
  isChecked(value) {
    return this.opts.value.current === value;
  }
  setValue(value) {
    this.opts.value.current = value;
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    role: "radiogroup",
    "aria-required": boolToStr(this.opts.required.current),
    "aria-disabled": boolToStr(this.opts.disabled.current),
    "aria-readonly": this.opts.readonly.current ? "true" : void 0,
    "data-disabled": boolToEmptyStrOrUndef(this.opts.disabled.current),
    "data-readonly": boolToEmptyStrOrUndef(this.opts.readonly.current),
    "data-orientation": this.opts.orientation.current,
    [radioGroupAttrs.root]: "",
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class RadioGroupItemState {
  static create(opts) {
    return new RadioGroupItemState(opts, RadioGroupRootContext.get());
  }
  opts;
  root;
  attachment;
  #checked = derived(() => this.root.opts.value.current === this.opts.value.current);
  get checked() {
    return this.#checked();
  }
  set checked($$value) {
    return this.#checked($$value);
  }
  #isDisabled = derived(() => this.opts.disabled.current || this.root.opts.disabled.current);
  #isReadonly = derived(() => this.root.opts.readonly.current);
  #isChecked = derived(() => this.root.isChecked(this.opts.value.current));
  #tabIndex = -1;
  constructor(opts, root) {
    this.opts = opts;
    this.root = root;
    this.attachment = attachRef(this.opts.ref);
    if (this.opts.value.current === this.root.opts.value.current) {
      this.root.rovingFocusGroup.setCurrentTabStopId(this.opts.id.current);
      this.#tabIndex = 0;
    } else if (!this.root.opts.value.current) {
      this.#tabIndex = 0;
    }
    watch(
      [
        () => this.opts.value.current,
        () => this.root.opts.value.current
      ],
      () => {
        if (this.opts.value.current === this.root.opts.value.current) {
          this.root.rovingFocusGroup.setCurrentTabStopId(this.opts.id.current);
          this.#tabIndex = 0;
        }
      }
    );
    this.onclick = this.onclick.bind(this);
    this.onkeydown = this.onkeydown.bind(this);
    this.onfocus = this.onfocus.bind(this);
  }
  onclick(_) {
    if (this.opts.disabled.current || this.#isReadonly()) return;
    this.root.setValue(this.opts.value.current);
  }
  onfocus(_) {
    if (!this.root.hasValue || this.#isReadonly()) return;
    this.root.setValue(this.opts.value.current);
  }
  onkeydown(e) {
    if (this.#isDisabled()) return;
    if (e.key === SPACE) {
      e.preventDefault();
      if (!this.#isReadonly()) {
        this.root.setValue(this.opts.value.current);
      }
      return;
    }
    this.root.rovingFocusGroup.handleKeydown(this.opts.ref.current, e, true);
  }
  #snippetProps = derived(() => ({ checked: this.#isChecked() }));
  get snippetProps() {
    return this.#snippetProps();
  }
  set snippetProps($$value) {
    return this.#snippetProps($$value);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    disabled: this.#isDisabled() ? true : void 0,
    "data-value": this.opts.value.current,
    "data-orientation": this.root.opts.orientation.current,
    "data-disabled": boolToEmptyStrOrUndef(this.#isDisabled()),
    "data-readonly": boolToEmptyStrOrUndef(this.#isReadonly()),
    "data-state": this.#isChecked() ? "checked" : "unchecked",
    "aria-checked": getAriaChecked(this.#isChecked()),
    [radioGroupAttrs.item]: "",
    type: "button",
    role: "radio",
    tabindex: this.#tabIndex,
    onkeydown: this.onkeydown,
    onfocus: this.onfocus,
    onclick: this.onclick,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class RadioGroupInputState {
  static create() {
    return new RadioGroupInputState(RadioGroupRootContext.get());
  }
  root;
  #shouldRender = derived(() => this.root.opts.name.current !== void 0);
  get shouldRender() {
    return this.#shouldRender();
  }
  set shouldRender($$value) {
    return this.#shouldRender($$value);
  }
  constructor(root) {
    this.root = root;
    this.onfocus = this.onfocus.bind(this);
  }
  onfocus(_) {
    this.root.rovingFocusGroup.focusCurrentTabStop();
  }
  #props = derived(() => ({
    name: this.root.opts.name.current,
    value: this.root.opts.value.current,
    required: this.root.opts.required.current,
    disabled: this.root.opts.disabled.current,
    onfocus: this.onfocus
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
function Radio_group_input($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const inputState = RadioGroupInputState.create();
    if (inputState.shouldRender) {
      $$renderer2.push("<!--[-->");
      Hidden_input($$renderer2, spread_props([inputState.props]));
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
function Radio_group$1($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const uid = props_id($$renderer2);
    let {
      disabled = false,
      children,
      child,
      value = "",
      ref = null,
      orientation = "vertical",
      loop = true,
      name = void 0,
      required = false,
      readonly = false,
      id = createId(uid),
      onValueChange = noop,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    const rootState = RadioGroupRootState.create({
      orientation: boxWith(() => orientation),
      disabled: boxWith(() => disabled),
      loop: boxWith(() => loop),
      name: boxWith(() => name),
      required: boxWith(() => required),
      readonly: boxWith(() => readonly),
      id: boxWith(() => id),
      value: boxWith(() => value, (v) => {
        if (v === value) return;
        value = v;
        onValueChange?.(v);
      }),
      ref: boxWith(() => ref, (v) => ref = v)
    });
    const mergedProps = mergeProps(restProps, rootState.props);
    if (child) {
      $$renderer2.push("<!--[-->");
      child($$renderer2, { props: mergedProps });
      $$renderer2.push(`<!---->`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div${attributes({ ...mergedProps })}>`);
      children?.($$renderer2);
      $$renderer2.push(`<!----></div>`);
    }
    $$renderer2.push(`<!--]--> `);
    Radio_group_input($$renderer2);
    $$renderer2.push(`<!---->`);
    bind_props($$props, { value, ref });
  });
}
function Radio_group_item$1($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const uid = props_id($$renderer2);
    let {
      id = createId(uid),
      children,
      child,
      value,
      disabled = false,
      ref = null,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    const itemState = RadioGroupItemState.create({
      value: boxWith(() => value),
      disabled: boxWith(() => disabled ?? false),
      id: boxWith(() => id),
      ref: boxWith(() => ref, (v) => ref = v)
    });
    const mergedProps = mergeProps(restProps, itemState.props);
    if (child) {
      $$renderer2.push("<!--[-->");
      child($$renderer2, { props: mergedProps, ...itemState.snippetProps });
      $$renderer2.push(`<!---->`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<button${attributes({ ...mergedProps })}>`);
      children?.($$renderer2, itemState.snippetProps);
      $$renderer2.push(`<!----></button>`);
    }
    $$renderer2.push(`<!--]-->`);
    bind_props($$props, { ref });
  });
}
function Card_description($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      class: className,
      children,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    $$renderer2.push(`<p${attributes({
      "data-slot": "card-description",
      class: clsx(cn("text-muted-foreground text-sm", className)),
      ...restProps
    })}>`);
    children?.($$renderer2);
    $$renderer2.push(`<!----></p>`);
    bind_props($$props, { ref });
  });
}
function Card_header($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      class: className,
      children,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    $$renderer2.push(`<div${attributes({
      "data-slot": "card-header",
      class: clsx(cn("@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6", className)),
      ...restProps
    })}>`);
    children?.($$renderer2);
    $$renderer2.push(`<!----></div>`);
    bind_props($$props, { ref });
  });
}
function Card_title($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      class: className,
      children,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    $$renderer2.push(`<div${attributes({
      "data-slot": "card-title",
      class: clsx(cn("leading-none font-semibold", className)),
      ...restProps
    })}>`);
    children?.($$renderer2);
    $$renderer2.push(`<!----></div>`);
    bind_props($$props, { ref });
  });
}
function Dialog($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { open = false, $$slots, $$events, ...restProps } = $$props;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<!---->`);
      Dialog$1($$renderer3, spread_props([
        restProps,
        {
          get open() {
            return open;
          },
          set open($$value) {
            open = $$value;
            $$settled = false;
          }
        }
      ]));
      $$renderer3.push(`<!---->`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
    bind_props($$props, { open });
  });
}
function Dialog_portal($$renderer, $$props) {
  let { $$slots, $$events, ...restProps } = $$props;
  $$renderer.push(`<!---->`);
  Portal($$renderer, spread_props([restProps]));
  $$renderer.push(`<!---->`);
}
function Dialog_title($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      class: className,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<!---->`);
      Dialog_title$1($$renderer3, spread_props([
        {
          "data-slot": "dialog-title",
          class: cn("text-lg leading-none font-semibold", className)
        },
        restProps,
        {
          get ref() {
            return ref;
          },
          set ref($$value) {
            ref = $$value;
            $$settled = false;
          }
        }
      ]));
      $$renderer3.push(`<!---->`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
    bind_props($$props, { ref });
  });
}
function Dialog_footer($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      class: className,
      children,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    $$renderer2.push(`<div${attributes({
      "data-slot": "dialog-footer",
      class: clsx(cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)),
      ...restProps
    })}>`);
    children?.($$renderer2);
    $$renderer2.push(`<!----></div>`);
    bind_props($$props, { ref });
  });
}
function Dialog_header($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      class: className,
      children,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    $$renderer2.push(`<div${attributes({
      "data-slot": "dialog-header",
      class: clsx(cn("flex flex-col gap-2 text-center sm:text-start", className)),
      ...restProps
    })}>`);
    children?.($$renderer2);
    $$renderer2.push(`<!----></div>`);
    bind_props($$props, { ref });
  });
}
function Dialog_overlay($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      class: className,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<!---->`);
      Dialog_overlay$1($$renderer3, spread_props([
        {
          "data-slot": "dialog-overlay",
          class: cn("data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50", className)
        },
        restProps,
        {
          get ref() {
            return ref;
          },
          set ref($$value) {
            ref = $$value;
            $$settled = false;
          }
        }
      ]));
      $$renderer3.push(`<!---->`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
    bind_props($$props, { ref });
  });
}
function Dialog_content($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      class: className,
      portalProps,
      children,
      showCloseButton = true,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      Dialog_portal($$renderer3, spread_props([
        portalProps,
        {
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->`);
            Dialog_overlay($$renderer4, {});
            $$renderer4.push(`<!----> <!---->`);
            Dialog_content$1($$renderer4, spread_props([
              {
                "data-slot": "dialog-content",
                class: cn("bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg", className)
              },
              restProps,
              {
                get ref() {
                  return ref;
                },
                set ref($$value) {
                  ref = $$value;
                  $$settled = false;
                },
                children: ($$renderer5) => {
                  children?.($$renderer5);
                  $$renderer5.push(`<!----> `);
                  if (showCloseButton) {
                    $$renderer5.push("<!--[-->");
                    $$renderer5.push(`<!---->`);
                    Dialog_close($$renderer5, {
                      class: "ring-offset-background focus:ring-ring absolute end-4 top-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                      children: ($$renderer6) => {
                        X($$renderer6, {});
                        $$renderer6.push(`<!----> <span class="sr-only">Close</span>`);
                      },
                      $$slots: { default: true }
                    });
                    $$renderer5.push(`<!---->`);
                  } else {
                    $$renderer5.push("<!--[!-->");
                  }
                  $$renderer5.push(`<!--]-->`);
                },
                $$slots: { default: true }
              }
            ]));
            $$renderer4.push(`<!---->`);
          },
          $$slots: { default: true }
        }
      ]));
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
    bind_props($$props, { ref });
  });
}
function Dialog_description($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      class: className,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<!---->`);
      Dialog_description$1($$renderer3, spread_props([
        {
          "data-slot": "dialog-description",
          class: cn("text-muted-foreground text-sm", className)
        },
        restProps,
        {
          get ref() {
            return ref;
          },
          set ref($$value) {
            ref = $$value;
            $$settled = false;
          }
        }
      ]));
      $$renderer3.push(`<!---->`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
    bind_props($$props, { ref });
  });
}
function Radio_group($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      class: className,
      value = "",
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<!---->`);
      Radio_group$1($$renderer3, spread_props([
        {
          "data-slot": "radio-group",
          class: cn("grid gap-3", className)
        },
        restProps,
        {
          get ref() {
            return ref;
          },
          set ref($$value) {
            ref = $$value;
            $$settled = false;
          },
          get value() {
            return value;
          },
          set value($$value) {
            value = $$value;
            $$settled = false;
          }
        }
      ]));
      $$renderer3.push(`<!---->`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
    bind_props($$props, { ref, value });
  });
}
function Radio_group_item($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      class: className,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<!---->`);
      {
        let children = function($$renderer4, { checked }) {
          $$renderer4.push(`<div data-slot="radio-group-indicator" class="relative flex items-center justify-center">`);
          if (checked) {
            $$renderer4.push("<!--[-->");
            Circle($$renderer4, {
              class: "fill-primary absolute start-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2"
            });
          } else {
            $$renderer4.push("<!--[!-->");
          }
          $$renderer4.push(`<!--]--></div>`);
        };
        Radio_group_item$1($$renderer3, spread_props([
          {
            "data-slot": "radio-group-item",
            class: cn("border-input text-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 aspect-square size-4 shrink-0 rounded-full border shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50", className)
          },
          restProps,
          {
            get ref() {
              return ref;
            },
            set ref($$value) {
              ref = $$value;
              $$settled = false;
            },
            children,
            $$slots: { default: true }
          }
        ]));
      }
      $$renderer3.push(`<!---->`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
    bind_props($$props, { ref });
  });
}
function SettingsModal($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { open = false } = $$props;
    const executionModes = [
      {
        value: "local",
        label: "Local (Desktop daemon)",
        note: "Runs on this machine with local agent binaries."
      },
      {
        value: "cloud",
        label: "Cloud (Coming soon)",
        note: "Background execution with managed containers."
      }
    ];
    let selectedMode = "local";
    const agentRows = [
      {
        name: "aider",
        path: "/usr/local/bin/aider",
        status: "active",
        label: "Detected"
      },
      {
        name: "opencode",
        path: "~/.local/bin/opencode",
        status: "active",
        label: "Detected"
      },
      {
        name: "cursor",
        path: "Not found",
        status: "missing",
        label: "Missing"
      },
      {
        name: "cline",
        path: "/usr/local/bin/cline",
        status: "idle",
        label: "Idle"
      }
    ];
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<!---->`);
      Dialog($$renderer3, {
        get open() {
          return open;
        },
        set open($$value) {
          open = $$value;
          $$settled = false;
        },
        children: ($$renderer4) => {
          $$renderer4.push(`<!---->`);
          Dialog_content($$renderer4, {
            class: "sm:max-w-2xl",
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->`);
              Dialog_header($$renderer5, {
                class: "gap-2",
                children: ($$renderer6) => {
                  $$renderer6.push(`<!---->`);
                  Dialog_title($$renderer6, {
                    children: ($$renderer7) => {
                      $$renderer7.push(`<!---->Settings`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer6.push(`<!----> <!---->`);
                  Dialog_description($$renderer6, {
                    children: ($$renderer7) => {
                      $$renderer7.push(`<!---->Manage execution, connections, and agent detection.`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer6.push(`<!----> `);
                  Button($$renderer6, {
                    variant: "ghost",
                    size: "icon",
                    type: "button",
                    "aria-label": "Close settings",
                    onclick: () => open = false,
                    children: ($$renderer7) => {
                      X($$renderer7, { size: 16 });
                    },
                    $$slots: { default: true }
                  });
                  $$renderer6.push(`<!---->`);
                },
                $$slots: { default: true }
              });
              $$renderer5.push(`<!----> <div class="space-y-4"><div class="grid gap-4 md:grid-cols-2"><!---->`);
              Card($$renderer5, {
                children: ($$renderer6) => {
                  $$renderer6.push(`<!---->`);
                  Card_header($$renderer6, {
                    class: "pb-2",
                    children: ($$renderer7) => {
                      $$renderer7.push(`<!---->`);
                      Card_title($$renderer7, {
                        class: "text-sm",
                        children: ($$renderer8) => {
                          $$renderer8.push(`<!---->Execution Mode`);
                        },
                        $$slots: { default: true }
                      });
                      $$renderer7.push(`<!----> <!---->`);
                      Card_description($$renderer7, {
                        children: ($$renderer8) => {
                          $$renderer8.push(`<!---->Choose where Porter runs your agents.`);
                        },
                        $$slots: { default: true }
                      });
                      $$renderer7.push(`<!---->`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer6.push(`<!----> <!---->`);
                  Card_content($$renderer6, {
                    class: "space-y-2",
                    children: ($$renderer7) => {
                      $$renderer7.push(`<!---->`);
                      Radio_group($$renderer7, {
                        class: "space-y-2",
                        get value() {
                          return selectedMode;
                        },
                        set value($$value) {
                          selectedMode = $$value;
                          $$settled = false;
                        },
                        children: ($$renderer8) => {
                          $$renderer8.push(`<!--[-->`);
                          const each_array = ensure_array_like(executionModes);
                          for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                            let mode = each_array[$$index];
                            $$renderer8.push(`<label class="flex items-start gap-3 rounded-md border border-border p-3 text-sm transition hover:bg-muted/40"><!---->`);
                            Radio_group_item($$renderer8, { value: mode.value });
                            $$renderer8.push(`<!----> <div class="space-y-1"><p class="font-medium text-foreground">${escape_html(mode.label)}</p> <p class="text-xs text-muted-foreground">${escape_html(mode.note)}</p></div></label>`);
                          }
                          $$renderer8.push(`<!--]-->`);
                        },
                        $$slots: { default: true }
                      });
                      $$renderer7.push(`<!---->`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer6.push(`<!---->`);
                },
                $$slots: { default: true }
              });
              $$renderer5.push(`<!----> <!---->`);
              Card($$renderer5, {
                children: ($$renderer6) => {
                  $$renderer6.push(`<!---->`);
                  Card_header($$renderer6, {
                    class: "pb-2",
                    children: ($$renderer7) => {
                      $$renderer7.push(`<!---->`);
                      Card_title($$renderer7, {
                        class: "text-sm",
                        children: ($$renderer8) => {
                          $$renderer8.push(`<!---->GitHub Connection`);
                        },
                        $$slots: { default: true }
                      });
                      $$renderer7.push(`<!----> <!---->`);
                      Card_description($$renderer7, {
                        children: ($$renderer8) => {
                          $$renderer8.push(`<!---->Authentication and connection status.`);
                        },
                        $$slots: { default: true }
                      });
                      $$renderer7.push(`<!---->`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer6.push(`<!----> <!---->`);
                  Card_content($$renderer6, {
                    class: "flex flex-col items-start gap-3",
                    children: ($$renderer7) => {
                      Badge($$renderer7, {
                        variant: "secondary",
                        class: "gap-2",
                        children: ($$renderer8) => {
                          $$renderer8.push(`<span class="h-2 w-2 rounded-full bg-emerald-500"></span> Connected as @jackgolding`);
                        },
                        $$slots: { default: true }
                      });
                      $$renderer7.push(`<!----> <span class="text-xs text-muted-foreground">Last synced 3m ago</span> `);
                      Button($$renderer7, {
                        variant: "secondary",
                        type: "button",
                        children: ($$renderer8) => {
                          $$renderer8.push(`<!---->Disconnect`);
                        },
                        $$slots: { default: true }
                      });
                      $$renderer7.push(`<!---->`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer6.push(`<!---->`);
                },
                $$slots: { default: true }
              });
              $$renderer5.push(`<!----></div> <!---->`);
              Card($$renderer5, {
                children: ($$renderer6) => {
                  $$renderer6.push(`<!---->`);
                  Card_header($$renderer6, {
                    class: "pb-2",
                    children: ($$renderer7) => {
                      $$renderer7.push(`<!---->`);
                      Card_title($$renderer7, {
                        class: "text-sm",
                        children: ($$renderer8) => {
                          $$renderer8.push(`<!---->Agent Configuration`);
                        },
                        $$slots: { default: true }
                      });
                      $$renderer7.push(`<!----> <!---->`);
                      Card_description($$renderer7, {
                        children: ($$renderer8) => {
                          $$renderer8.push(`<!---->Agents auto-detected from your system.`);
                        },
                        $$slots: { default: true }
                      });
                      $$renderer7.push(`<!---->`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer6.push(`<!----> <!---->`);
                  Card_content($$renderer6, {
                    class: "space-y-2",
                    children: ($$renderer7) => {
                      $$renderer7.push(`<div class="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>Detected binaries and status.</span> `);
                      Button($$renderer7, {
                        variant: "secondary",
                        size: "sm",
                        type: "button",
                        children: ($$renderer8) => {
                          $$renderer8.push(`<!---->Refresh Agents`);
                        },
                        $$slots: { default: true }
                      });
                      $$renderer7.push(`<!----></div> <!---->`);
                      Table($$renderer7, {
                        children: ($$renderer8) => {
                          $$renderer8.push(`<!---->`);
                          Table_header($$renderer8, {
                            children: ($$renderer9) => {
                              $$renderer9.push(`<!---->`);
                              Table_row($$renderer9, {
                                children: ($$renderer10) => {
                                  $$renderer10.push(`<!---->`);
                                  Table_head($$renderer10, {
                                    children: ($$renderer11) => {
                                      $$renderer11.push(`<!---->Status`);
                                    },
                                    $$slots: { default: true }
                                  });
                                  $$renderer10.push(`<!----> <!---->`);
                                  Table_head($$renderer10, {
                                    children: ($$renderer11) => {
                                      $$renderer11.push(`<!---->Agent`);
                                    },
                                    $$slots: { default: true }
                                  });
                                  $$renderer10.push(`<!----> <!---->`);
                                  Table_head($$renderer10, {
                                    children: ($$renderer11) => {
                                      $$renderer11.push(`<!---->Path`);
                                    },
                                    $$slots: { default: true }
                                  });
                                  $$renderer10.push(`<!----> <!---->`);
                                  Table_head($$renderer10, {
                                    class: "text-right",
                                    children: ($$renderer11) => {
                                      $$renderer11.push(`<!---->State`);
                                    },
                                    $$slots: { default: true }
                                  });
                                  $$renderer10.push(`<!---->`);
                                },
                                $$slots: { default: true }
                              });
                              $$renderer9.push(`<!---->`);
                            },
                            $$slots: { default: true }
                          });
                          $$renderer8.push(`<!----> <!---->`);
                          Table_body($$renderer8, {
                            children: ($$renderer9) => {
                              $$renderer9.push(`<!--[-->`);
                              const each_array_1 = ensure_array_like(agentRows);
                              for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
                                let agent = each_array_1[$$index_1];
                                $$renderer9.push(`<!---->`);
                                Table_row($$renderer9, {
                                  children: ($$renderer10) => {
                                    $$renderer10.push(`<!---->`);
                                    Table_cell($$renderer10, {
                                      children: ($$renderer11) => {
                                        Badge($$renderer11, {
                                          variant: agent.status === "missing" ? "destructive" : "secondary",
                                          children: ($$renderer12) => {
                                            $$renderer12.push(`<!---->${escape_html(agent.status)}`);
                                          },
                                          $$slots: { default: true }
                                        });
                                      },
                                      $$slots: { default: true }
                                    });
                                    $$renderer10.push(`<!----> <!---->`);
                                    Table_cell($$renderer10, {
                                      class: "capitalize",
                                      children: ($$renderer11) => {
                                        $$renderer11.push(`<!---->${escape_html(agent.name)}`);
                                      },
                                      $$slots: { default: true }
                                    });
                                    $$renderer10.push(`<!----> <!---->`);
                                    Table_cell($$renderer10, {
                                      class: "text-xs text-muted-foreground",
                                      children: ($$renderer11) => {
                                        $$renderer11.push(`<!---->${escape_html(agent.path)}`);
                                      },
                                      $$slots: { default: true }
                                    });
                                    $$renderer10.push(`<!----> <!---->`);
                                    Table_cell($$renderer10, {
                                      class: "text-right text-xs text-muted-foreground",
                                      children: ($$renderer11) => {
                                        $$renderer11.push(`<!---->${escape_html(agent.label)}`);
                                      },
                                      $$slots: { default: true }
                                    });
                                    $$renderer10.push(`<!---->`);
                                  },
                                  $$slots: { default: true }
                                });
                                $$renderer9.push(`<!---->`);
                              }
                              $$renderer9.push(`<!--]-->`);
                            },
                            $$slots: { default: true }
                          });
                          $$renderer8.push(`<!---->`);
                        },
                        $$slots: { default: true }
                      });
                      $$renderer7.push(`<!---->`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer6.push(`<!---->`);
                },
                $$slots: { default: true }
              });
              $$renderer5.push(`<!----></div> <!---->`);
              Dialog_footer($$renderer5, {
                class: "flex flex-wrap gap-2",
                children: ($$renderer6) => {
                  Button($$renderer6, {
                    variant: "secondary",
                    type: "button",
                    onclick: () => open = false,
                    children: ($$renderer7) => {
                      $$renderer7.push(`<!---->Cancel`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer6.push(`<!----> `);
                  Button($$renderer6, {
                    type: "button",
                    children: ($$renderer7) => {
                      $$renderer7.push(`<!---->Save Changes`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer6.push(`<!---->`);
                },
                $$slots: { default: true }
              });
              $$renderer5.push(`<!---->`);
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!---->`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!---->`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
  });
}
export {
  Card_header as C,
  SettingsModal as S,
  Card_title as a
};
