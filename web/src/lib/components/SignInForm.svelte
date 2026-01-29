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

<div class="flex h-full flex-col justify-between px-8">
  <!-- Logo + wordmark -->
  <div class="flex flex-col items-center pt-8">
    <div class="flex items-center gap-3">
      <img src={logo} alt="Porter" class="h-10 w-10 rounded" />
      <span class="font-mono text-base font-medium uppercase tracking-[0.45em] text-[#a39c95]">PORTER</span>
    </div>
  </div>

  <!-- Heading + tagline -->
  <div class="flex flex-col items-center text-center">
    <h1 class="font-mono text-3xl font-bold tracking-tight text-[#f5f1ed]">Sign in to Porter</h1>
    <p class="mt-4 text-md leading-relaxed text-[#a39c95]">Route GitHub Issues to AI agents<br/>with @porter mentions.</p>
  </div>

  <!-- Button section -->
  <div class="flex w-full flex-col items-center gap-4">
    <Button
      size="lg"
      class="h-12 w-72 gap-2 rounded-lg bg-[#c95500] px-8 text-[#140c07] hover:bg-[#d45f00]"
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

  <!-- Footer -->
  <div class="w-full border-t border-white/5 py-6 text-center text-[0.7rem] uppercase tracking-[0.2em] text-[#5f5852]">
    Docs · Privacy
  </div>
</div>
