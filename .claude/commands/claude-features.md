---
description: Quick reference of Claude Code features and capabilities
---

# Claude Code Features Quick Reference

## Agent System

| Feature | How to Use | When |
|---------|------------|------|
| **Subagents** | Task tool with `subagent_type` | Isolated tasks, specialized focus |
| **Custom agents** | Create `.claude/agents/*.md` | Reusable specialized behaviors |
| **Parallel agents** | Multiple Task calls in one message | Independent concurrent tasks |
| **Background agents** | Task with `run_in_background: true` | Long tasks, continue working |

## Available Built-in Agents

- `Explore` - Fast codebase searching
- `Plan` - Research and planning
- `general-purpose` - Multi-step complex tasks
- `claude-code-guide` - Questions about Claude Code
- `code-reviewer` - Code quality review
- `debugger` - Error diagnosis
- Plus 50+ specialized agents

## Skills System

| Location | Purpose |
|----------|---------|
| `.claude/skills/*/SKILL.md` | Reusable knowledge packages |
| Auto-discovered based on task | No manual invocation needed |

## Slash Commands

| Command | Purpose |
|---------|---------|
| `/commit` | Create git commit |
| `/create-agent` | Create new agent (custom) |
| `/brainstorm` | Interactive design refinement |
| `/write-plan` | Create implementation plan |
| `/execute-plan` | Execute plan in batches |
| `/code-review` | Review PR or code |

## MCP Servers

Add external integrations:
```bash
claude mcp add --transport http NAME URL
claude mcp add --transport stdio NAME -- COMMAND
```

## Hooks

Automate validations in `.claude/settings.json`:
- `PreToolUse` - Before tool execution
- `PostToolUse` - After tool execution
- `UserPromptSubmit` - Before processing user input

## Memory

| Feature | Use |
|---------|-----|
| **Episodic memory** | `mcp__plugin_episodic-memory_episodic-memory__search` |
| **CLAUDE.md** | Project-level instructions |
| **Todo lists** | Task tracking across turns |

## Efficiency Tips

1. **Parallel calls**: Independent operations in one message
2. **Model selection**: haiku (fast), sonnet (balanced), opus (complex)
3. **Agent delegation**: Specialized subagents for focused work
4. **Background tasks**: Long operations don't block

---

**Need more detail?** Ask about any feature or use the meta-agent-coordinator!
