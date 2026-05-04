Slug: openclaw-on-whatsapp-integration-guide

Meta Title: OpenClaw on WhatsApp: Integration Guide (Setup, Pairing, Policies)

Meta Description:
Learn how to set up OpenClaw on WhatsApp using WhatsApp Web (Baileys): install the plugin, scan the QR, configure allowlists/pairing, and go live.

Article Title: OpenClaw on WhatsApp

Article Description:
A practical, step-by-step guide to integrate OpenClaw with WhatsApp so you can message your AI agent from your phone. Covers plugin install, QR login, access policies, pairing, group behavior, and troubleshooting.

# OpenClaw on WhatsApp: The Practical Integration Guide

If you want to use OpenClaw from your phone, WhatsApp is one of the simplest ways to do it.

With **OpenClaw on WhatsApp**, you can message your agent like a normal chat: ask questions, request tasks, and get results back in the same thread—without opening a dashboard or logging into a web app.

This article walks you through the full setup for **OpenClaw integration on WhatsApp**, including:

- Installing the WhatsApp plugin
- Linking WhatsApp via QR code
- Configuring **dmPolicy**, allowlists, and pairing
- Handling group messages safely
- Common troubleshooting steps

Keyword target: **openclaw on whatsapp**

## What does “OpenClaw on WhatsApp” mean?

OpenClaw connects your chat platforms to your agent runtime through a self-hosted “Gateway.” When you enable the WhatsApp channel, OpenClaw uses a production-ready WhatsApp Web integration (via Baileys) so the Gateway can:

- Receive messages from your WhatsApp account
- Route them to your agent session(s)
- Send replies back to WhatsApp

In other words: you can operate your agent from WhatsApp like it’s a normal contact.

## Why integrate OpenClaw with WhatsApp?

Most builders want at least one channel that is:

- Always available (you already use it)
- Fast on mobile
- Good for quick “do this now” requests
- Suitable for personal ops (notes, reminders, task delegation)

WhatsApp is perfect for that.

Common use cases:

- “Summarize this article and give me 5 bullets”
- “Draft a reply to this message”
- “Create a checklist for launching feature X”
- “Follow up on my to-dos”
- “Post an update in Discord/Slack” (when you’ve connected those channels too)

## Before you start (requirements)

You’ll need:

- OpenClaw installed on the machine where you’ll run the Gateway
- A WhatsApp account you can link via WhatsApp Web
- A plan for access control (pairing vs allowlist)

Recommendation: If possible, use a **dedicated WhatsApp number** for OpenClaw. It keeps routing and permissions cleaner and reduces the chance of self-chat confusion.

## Step 1: Install the WhatsApp plugin

OpenClaw can install the WhatsApp plugin automatically during onboarding or when you add/login to the channel.

If you want to install it manually:

- Install plugin package: `@openclaw/whatsapp`

The manual command:

```bash
openclaw plugins install @openclaw/whatsapp
```

## Step 2: Configure WhatsApp access policy (important)

Before linking the account, decide how OpenClaw should accept inbound WhatsApp DMs.

OpenClaw’s WhatsApp channel supports a **DM policy**:

- `pairing` (default): unknown numbers must request pairing approval
- `allowlist`: only numbers in `allowFrom` can DM the agent
- `open`: requires `allowFrom` to include `"*"`
- `disabled`: block all DMs

A safe starting config (pairing + allowlist for yourself):

```json5
{
  channels: {
    whatsapp: {
      dmPolicy: "pairing",
      allowFrom: ["+15551234567"],

      // Group messages are usually the risky part. Start strict.
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15551234567"],
    },
  },
}
```

Notes:

- Phone numbers should be E.164 style (like `+15551234567`). OpenClaw normalizes them internally.
- `allowFrom` is for inbound DM access control.
- If you don’t configure allowlists, you risk unexpected inbound messages reaching your agent.

### Dedicated number vs personal number

Two common patterns:

1) Dedicated number (recommended)

```json5
{
  channels: {
    whatsapp: {
      dmPolicy: "allowlist",
      allowFrom: ["+15551234567"],
    },
  },
}
```

2) Personal number fallback

If you link your personal number, OpenClaw can run in a self-chat-friendly mode (commonly called “self chat mode”), and you should keep `dmPolicy` strict (usually `allowlist`) and include your own number in `allowFrom`.

## Step 3: Link WhatsApp (QR login)

Once your policy is set, link WhatsApp via WhatsApp Web login.

Command:

```bash
openclaw channels login --channel whatsapp
```

If you’re running multiple WhatsApp accounts (for example `work`):

```bash
openclaw channels login --channel whatsapp --account work
```

You’ll be shown a QR code.

On your phone:

- Open WhatsApp
- Go to “Linked devices”
- Link a device and scan the QR

### Using a custom WhatsApp auth directory (optional)

If you want to attach an existing WhatsApp Web auth directory:

```bash
openclaw channels add --channel whatsapp --account work --auth-dir /path/to/wa-auth
openclaw channels login --channel whatsapp --account work
```

## Step 4: Start the OpenClaw Gateway

After WhatsApp is linked, start the Gateway:

```bash
openclaw gateway
```

At this point, your WhatsApp channel should be online.

## Step 5: Approve pairing requests (if using pairing mode)

If your `dmPolicy` is `pairing`, new numbers must request access.

Commands:

```bash
openclaw pairing list whatsapp
openclaw pairing approve whatsapp <CODE>
```

Operational details:

- Pairing requests expire after 1 hour
- Pending requests are capped per channel
- Pairing approvals are persisted and merged with your configured allowlists

## Group messages: safe defaults and how activation works

Groups are powerful, but they’re also where mistakes happen.

OpenClaw supports:

- A group allowlist (which groups are eligible)
- A group sender policy (who can trigger the agent in those groups)
- Mention/activation controls (so it doesn’t talk in every thread)

Recommended “start strict” approach:

- `groupPolicy: "allowlist"`
- Set `groupAllowFrom` to your number (and maybe one or two trusted operators)
- Require mention activation for responses

Important behavior:

- A quote/reply can satisfy “mention gating” in some setups, but it does not bypass sender authorization.
- If you use `groupPolicy: "allowlist"`, non-allowlisted senders are blocked even if they reply to an allowlisted user.

## Multi-account WhatsApp setups

You can run multiple WhatsApp accounts under one OpenClaw Gateway and override policy per account.

Example structure:

```json5
{
  channels: {
    whatsapp: {
      accounts: {
        work: {
          dmPolicy: "allowlist",
          allowFrom: ["+15551234567"],
        },
      },
    },
  },
}
```

This is useful when:

- You want one number for personal ops and one for team ops
- You want different allowlists per number

## Privacy and plugin hooks (important)

WhatsApp messages can contain sensitive data (phone numbers, group identifiers, names, etc.).

For that reason, OpenClaw does **not** broadcast inbound WhatsApp `message_received` hook payloads to plugins unless you explicitly opt in.

Opt-in example:

```json5
{
  channels: {
    whatsapp: {
      pluginHooks: {
        messageReceived: true,
      },
    },
  },
}
```

Only enable this if you trust the plugins that will receive WhatsApp message content.

## Troubleshooting: the most common issues

### 1) QR code doesn’t scan or login fails

- Make sure you’re linking from WhatsApp “Linked devices”
- Re-run `openclaw channels login --channel whatsapp`
- If the auth directory is stale/corrupted, re-link with a fresh login (or set a clean `--auth-dir`)

### 2) Gateway is running but no messages arrive

Check:

- Your `dmPolicy` and `allowFrom`
- Pairing status (if using pairing mode)
- Whether you’re messaging the correct linked number

### 3) It responds in groups when you don’t want it to

Lock down group behavior:

- Set `groupPolicy: "allowlist"`
- Restrict `groupAllowFrom`
- Keep mention-based activation as the default

### 4) Outbound sends fail

Outbound sends require an active WhatsApp listener for the target account.

If you’re running multiple accounts, confirm:

- You linked the correct `--account`
- The Gateway is running and the account is connected

## Best practices for production

If you plan to rely on OpenClaw on WhatsApp daily:

- Use a dedicated WhatsApp number when possible
- Use `allowlist` or `pairing` (avoid `open` unless you truly need it)
- Keep group access strict
- Don’t enable plugin hooks for WhatsApp unless necessary
- Treat WhatsApp as a high-sensitivity channel: people tend to send personal info there

## FAQ

### Is OpenClaw’s WhatsApp integration Twilio-based?

No. OpenClaw’s WhatsApp channel is WhatsApp Web based (Baileys) in the current channel architecture.

### Can I run multiple WhatsApp accounts?

Yes. You can configure per-account policies and link each account separately.

### Should I use pairing or allowlist?

- Use **allowlist** if you know exactly who should have access.
- Use **pairing** if you want an approval step for new numbers.

## Ready to set up OpenClaw on WhatsApp?

If you want, share:

- The environment you’re deploying on (local laptop, VPS, home server)
- Whether you’re using a dedicated WhatsApp number
- Your desired policy (pairing vs allowlist)

…and I’ll tailor the exact config block and best default settings for your setup.
