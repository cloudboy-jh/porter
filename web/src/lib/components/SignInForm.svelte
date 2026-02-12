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

  const flyCliCommand = `fly auth login
fly tokens create org --name "porter" --expiry 30d`;

  let copiedFlyCli = $state(false);

  const copyFlyCli = async () => {
    try {
      await navigator.clipboard.writeText(flyCliCommand);
      copiedFlyCli = true;
      setTimeout(() => {
        copiedFlyCli = false;
      }, 1200);
    } catch {
      copiedFlyCli = false;
    }
  };

  let {
    isConnected,
    githubHandle,
    isSigningOut,
    authErrorCode = '',
    githubAppInstallUrl = null,
    onSignOut
  }: Props = $props();
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

  <div class="space-y-3">
    <p class="text-center text-[0.68rem] uppercase tracking-[0.2em] text-[#756d67]">Choose setup path</p>
    <div class="grid gap-3 sm:grid-cols-2">
      <div class="rounded-lg border border-white/10 bg-black/20 p-3 text-left">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#f3a56b]">Quick setup</p>
        <p class="mt-1 text-sm font-medium text-[#f5f1ed]">Grab an org token</p>
        <p class="mt-1 text-xs text-[#9f9892]">No manual app deploy required. Porter validates credentials and handles app setup.</p>
        <ol class="mt-2 space-y-1 text-xs text-[#b7b0aa]">
          <li>1. Open Fly dashboard tokens</li>
          <li>2. Create an org token</li>
          <li>3. Paste token in Settings</li>
          <li>4. Run your first Porter task</li>
        </ol>
        <a
          href="https://fly.io/dashboard/personal/tokens"
          target="_blank"
          rel="noreferrer"
          class="mt-3 inline-block text-xs font-medium text-[#f3a56b] hover:text-[#ffc08d]"
        >
          Open Fly tokens ↗
        </a>
        {#if isConnected}
          <a class="mt-3 inline-block text-xs font-medium text-[#f3a56b] hover:text-[#ffc08d]" href="/settings?setup=org">
            Continue with org token ->
          </a>
        {:else}
          <p class="mt-3 text-xs text-[#8e8781]">Connect GitHub, then continue in Settings.</p>
        {/if}
      </div>

      <div class="rounded-lg border border-white/10 bg-black/20 p-3 text-left">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#f3a56b]">CLI path</p>
        <p class="mt-1 text-sm font-medium text-[#f5f1ed]">Do it with the Fly CLI</p>
        <p class="mt-1 text-xs text-[#9f9892]">Generate the same org token from terminal and paste it into Settings.</p>
        <div class="mt-2 rounded-md border border-white/10 bg-black/45 p-2">
          <pre class="overflow-x-auto font-mono text-[11px] leading-5 text-[#d7c7bc]">{flyCliCommand}</pre>
        </div>
        <button
          type="button"
          class="mt-2 text-xs font-medium text-[#f3a56b] hover:text-[#ffc08d]"
          onclick={copyFlyCli}
        >
          {copiedFlyCli ? 'Copied' : 'Copy terminal command'}
        </button>
        {#if isConnected}
          <a class="mt-3 inline-block text-xs font-medium text-[#f3a56b] hover:text-[#ffc08d]" href="/settings?setup=org">
            Continue with CLI token ->
          </a>
        {:else}
          <p class="mt-3 text-xs text-[#8e8781]">Connect GitHub, then continue in Settings.</p>
        {/if}
      </div>
    </div>
  </div>

  <div class="mt-1 w-full border-t border-white/5 pt-5 text-center text-[0.68rem] uppercase tracking-[0.2em] text-[#5f5852]">
    Docs · Privacy
  </div>
</div>
