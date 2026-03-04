<script lang="ts">
  import { GithubLogo } from "phosphor-svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import logo from "../../logos/porter-logo-main.png";

  interface Props {
    isConnected: boolean;
    githubHandle: string;
    isSigningOut: boolean;
    authErrorCode?: string;
    githubAppInstallUrl?: string | null;
    onSignOut: () => void;
  }

  let {
    isConnected,
    githubHandle,
    isSigningOut,
    authErrorCode = '',
    githubAppInstallUrl = null,
    onSignOut
  }: Props = $props();

</script>

<div class="flex w-full flex-col gap-8 px-6 py-8 sm:px-10 sm:py-10 lg:px-12">
  <div class="flex flex-col items-center">
    <div class="flex items-center gap-3">
      <img src={logo} alt="Porter" class="h-10 w-10 rounded" />
      <span class="font-mono text-sm font-medium uppercase tracking-[0.42em] text-[#a39c95]">PORTER</span>
    </div>
  </div>

  <div class="flex flex-col items-center text-center">
    <h1 class="font-mono text-[1.65rem] font-bold tracking-tight text-[#f5f1ed]">Sign in to Porter</h1>
    <p class="mt-3 max-w-[34ch] text-sm leading-relaxed text-[#a39c95]">Route GitHub issues to AI models with fast @porter triage.</p>
  </div>

  {#if authErrorCode === 'install_required'}
    <div class="rounded-lg border border-[#c95500]/30 bg-[#2a1a12]/70 px-4 py-3 text-sm text-[#f5f1ed]">
      <p class="font-medium">Install the Porter GitHub App to continue.</p>
      <p class="mt-1 text-xs text-[#c8b8ad]">You are signed in, but Porter cannot dispatch tasks until the GitHub App is installed on at least one repository.</p>
      {#if githubAppInstallUrl}
        <a
          href={githubAppInstallUrl}
          target="_blank"
          rel="noreferrer"
          class="mt-3 inline-block text-xs font-semibold uppercase tracking-[0.16em] text-[#f3a56b] hover:text-[#ffc08d]"
        >
          Install GitHub App ->
        </a>
      {/if}
    </div>
  {:else if authErrorCode === 'install_check_failed'}
    <div class="rounded-lg border border-[#c95500]/30 bg-[#2a1a12]/70 px-4 py-3 text-sm text-[#f5f1ed]">
      <p class="font-medium">Unable to verify GitHub App installation right now.</p>
      <p class="mt-1 text-xs text-[#c8b8ad]">Reconnect GitHub and retry install. If this persists, check GitHub App callback/setup URLs and runtime credentials.</p>
      <a
        href="/api/auth/github?force=1"
        class="mt-3 inline-block text-xs font-semibold uppercase tracking-[0.16em] text-[#f3a56b] hover:text-[#ffc08d]"
      >
        Reconnect GitHub ->
      </a>
    </div>
  {:else if authErrorCode === 'missing_scopes'}
    <div class="rounded-lg border border-[#c95500]/30 bg-[#2a1a12]/70 px-4 py-3 text-sm text-[#f5f1ed]">
      <p class="font-medium">GitHub authorization is missing required scopes.</p>
      <p class="mt-1 text-xs text-[#c8b8ad]">Reconnect GitHub to grant repo, org, and gist scopes required for Porter automation.</p>
      <a
        href="/api/auth/github?force=1"
        class="mt-3 inline-block text-xs font-semibold uppercase tracking-[0.16em] text-[#f3a56b] hover:text-[#ffc08d]"
      >
        Reconnect GitHub ->
      </a>
    </div>
  {/if}

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

  <div class="space-y-3 rounded-lg border border-white/10 bg-black/20 p-4 text-left">
    <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#f3a56b]">Get started</p>
    <p class="text-sm text-[#d7c7bc]">After sign-in, open Settings to choose your default model and add provider API keys.</p>
    {#if isConnected}
      <a class="inline-block text-xs font-medium text-[#f3a56b] hover:text-[#ffc08d]" href="/settings">
        Open settings ->
      </a>
    {/if}
  </div>

  <div class="mt-1 w-full border-t border-white/5 pt-5 text-center text-[0.68rem] uppercase tracking-[0.2em] text-[#5f5852]">
    Docs · Privacy
  </div>
</div>
