<script lang="ts">
  import { base } from '$app/paths';
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

  const authNotice = $derived.by(() => {
    if (authErrorCode === 'install_required') {
      return {
        title: 'GitHub App installation required',
        body: 'Install Porter on at least one repository before dispatching tasks.',
        ctaLabel: 'Install GitHub App',
		href: githubAppInstallUrl ?? `${base}/api/auth/github?force=1`,
        external: Boolean(githubAppInstallUrl)
      };
    }
    if (authErrorCode === 'install_check_failed') {
      return {
        title: 'Cannot verify installation right now',
        body: 'Reconnect GitHub and retry installation verification.',
        ctaLabel: 'Reconnect GitHub',
		href: `${base}/api/auth/github?force=1`,
        external: false
      };
    }
    if (authErrorCode === 'missing_scopes') {
      return {
        title: 'Required GitHub scopes are missing',
        body: 'Reconnect GitHub to grant the permissions Porter needs.',
        ctaLabel: 'Reconnect GitHub',
		href: `${base}/api/auth/github?force=1`,
        external: false
      };
    }
    return null;
  });

</script>

<div class="flex w-full flex-col gap-6 px-6 py-8 sm:px-9 sm:py-9 lg:px-10">
  <div class="flex flex-col items-center">
    <div class="rounded-xl border border-white/10 bg-black/20 px-3.5 py-2.5">
      <div class="flex items-center gap-3">
        <img src={logo} alt="Porter" class="h-8 w-8 rounded" />
        <span class="font-mono text-sm font-medium uppercase tracking-[0.42em] text-[#b2aba5]">PORTER</span>
      </div>
    </div>
  </div>

  <div class="flex flex-col items-center text-center">
    <h1 class="font-mono text-[1.85rem] font-bold tracking-tight text-[#f7f3ef] sm:text-[1.95rem]">Sign in to Porter</h1>
    <p class="mt-2 max-w-[34ch] text-sm leading-relaxed text-[#a9a19a]">Connect GitHub. Dispatch tasks.</p>
  </div>

  {#if authNotice}
    <div class="rounded-lg border border-[#c95500]/35 bg-[#2a1a12]/70 px-4 py-3 text-sm text-[#f5f1ed]">
      <p class="font-medium">{authNotice.title}</p>
      <p class="mt-1 text-xs text-[#c8b8ad]">{authNotice.body}</p>
      <a
        href={authNotice.href}
        target={authNotice.external ? '_blank' : undefined}
        rel={authNotice.external ? 'noreferrer' : undefined}
        class="mt-2 inline-block text-xs font-semibold uppercase tracking-[0.16em] text-[#f3a56b] hover:text-[#ffc08d]"
      >
        {authNotice.ctaLabel} ->
      </a>
    </div>
  {/if}

  <div class="flex w-full flex-col items-center gap-3">
    <Button
      size="lg"
      class="h-12 w-72 gap-2 rounded-lg bg-[#d66000] px-8 text-[#160d08] shadow-[0_10px_30px_-16px_rgba(214,96,0,0.85)] hover:bg-[#e56a00]"
      href={`${base}/api/auth/github`}
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

</div>
