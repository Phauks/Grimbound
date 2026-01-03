---
description: Guided wizard to create a new Claude Code agent
---

# Create Agent Wizard

I'll help you create a custom Claude Code agent through a quick 5-step process.

## Step 1: Purpose
First, tell me: **What ONE thing should this agent do exceptionally well?**

Good examples:
- "Review TypeScript code for security issues"
- "Generate database migrations"
- "Write unit tests for React components"

## Step 2: Tools
Which tools does your agent need? (I'll suggest the minimal set)

Common tool sets:
- **Read-only**: Read, Grep, Glob
- **Code changes**: Read, Edit, Write, Bash
- **Full access**: All tools

## Step 3: Model
Choose based on task complexity:
- **haiku**: Fast, cheap (exploration, simple tasks)
- **sonnet**: Balanced (most use cases) - *recommended*
- **opus**: Maximum capability (complex reasoning)

## Step 4: Name
Give it a kebab-case name (e.g., `code-reviewer`, `db-migrator`, `test-writer`)

## Step 5: Description
Write a clear description that Claude can match against user requests.
Include keywords users might say when they need this agent.

---

Once you answer these questions, I'll:
1. Create the agent file in `.claude/agents/`
2. Write a well-structured system prompt
3. Include relevant examples
4. Test the agent with a sample task

**Let's start! What's the ONE thing your agent should do?**
