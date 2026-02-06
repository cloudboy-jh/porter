<script lang="ts">
  import { GithubLogo } from "phosphor-svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import logo from "../../logos/porter-logo-main.png";

  interface Props {
    isConnected: boolean;
    githubHandle: string;
    isSigningOut: boolean;
    onSignOut: () => void;
  }

  let { isConnected, githubHandle, isSigningOut, onSignOut }: Props = $props();
</script>

<div class="flex w-full flex-col gap-8 px-7 py-8 sm:px-10 sm:py-10">
  <div class="flex flex-col items-center">
    <div class="flex items-center gap-3">
      <img src={logo} alt="Porter" class="h-10 w-10 rounded" />
      <span class="font-mono text-sm font-medium uppercase tracking-[0.42em] text-[#a39c95]">PORTER</span>
    </div>
  </div>

  <div class="flex flex-col items-center text-center">
    <h1 class="font-mono text-[1.65rem] font-bold tracking-tight text-[#f5f1ed]">Sign in to Porter</h1>
    <p class="mt-3 max-w-[34ch] text-sm leading-relaxed text-[#a39c95]">Route GitHub issues to AI agents with fast @porter triage.</p>
  </div>

  <div class="flex w-full flex-col items-center gap-3">
    <Button
      size="lg"
      class="h-11 w-72 gap-2 rounded-lg bg-[#c95500] px-8 text-[#140c07] hover:bg-[#d45f00]"
      href="/api/auth/github"
    >
      <GithubLogo size={16} weight="regular" />
      {isConnected ? `Continue as @${githubHandle}` : "Continue with GitHub"}
    </Button>
    {#if isConnected}
      <button
        class="text-xs text-[#8c857f] hover:text-[#c95500]"
        disabled={isSigningOut}
        onclick={onSignOut}
      >
        Sign out
      </button>
    {/if}
  </div>

  <div class="mt-1 w-full border-t border-white/5 pt-5 text-center text-[0.68rem] uppercase tracking-[0.2em] text-[#5f5852]">
    Docs · Privacy
  </div>
</div>
