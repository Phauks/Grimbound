# Branch Protection Setup Guide

This guide explains how to configure branch protection rules for the `main` branch to ensure code quality and prevent accidental pushes.

## Why Branch Protection?

Branch protection rules:
- ✅ Prevent force pushes and deletions
- ✅ Require pull request reviews before merging
- ✅ Ensure CI tests pass before merging
- ✅ Maintain a clean, linear commit history
- ✅ Automatically clean up merged branches

---

## Setup Instructions

### 1. Navigate to Branch Protection Settings

1. Go to your repository on GitHub: https://github.com/Phauks/Clocktower_Token_Generator
2. Click **Settings** (top navigation bar)
3. Click **Branches** (left sidebar under "Code and automation")
4. Under "Branch protection rules", click **Add rule** or **Add branch protection rule**

### 2. Configure the Rule

#### Branch Name Pattern
```
main
```

#### Settings to Enable

**✅ Require a pull request before merging**
- Check this box
- **Required approvals:** 1 (or more if you have multiple maintainers)
- ✅ **Dismiss stale pull request approvals when new commits are pushed**
- ✅ **Require review from Code Owners** (optional, recommended if using CODEOWNERS)

**✅ Require status checks to pass before merging**
- Check this box
- ✅ **Require branches to be up to date before merging**

**Search and add these required status checks:**
- `validate (18.x)` - from CI workflow
- `validate (20.x)` - from CI workflow
- `Security Audit` - from dependency-audit workflow

> **Note:** These status checks will only appear after the workflows have run at least once. If you don't see them yet, wait for the CI workflow to complete, then come back and add them.

**✅ Require conversation resolution before merging**
- Check this box
- Ensures all PR comments are addressed

**✅ Require signed commits** (optional, recommended for security)
- Check this box only if you want to require GPG-signed commits

**✅ Require linear history**
- Check this box
- Forces squash merging or rebase merging (prevents merge commits)

**✅ Do not allow bypassing the above settings**
- Check this box
- Applies rules to administrators too (recommended)

**✅ Allow force pushes** → UNCHECK THIS
- Leave unchecked to prevent force pushes

**✅ Allow deletions** → UNCHECK THIS
- Leave unchecked to prevent branch deletion

### 3. Save the Rule

Click **Create** or **Save changes** at the bottom.

---

## Additional Repository Settings

### Enable Auto-Delete Branches

This automatically deletes head branches after PRs are merged:

1. Go to **Settings** → **General**
2. Scroll to **Pull Requests** section
3. ✅ Check **Automatically delete head branches**
4. Click **Save**

### Configure Merge Button Options

Control how PRs can be merged:

1. Go to **Settings** → **General**
2. Scroll to **Pull Requests** section
3. Configure merge options:
   - ✅ **Allow squash merging** (recommended - keeps history clean)
   - ❌ **Allow merge commits** (optional - only if you want merge commits)
   - ❌ **Allow rebase merging** (optional - alternative to squash)

4. If using squash merging:
   - **Default commit message:** "Pull request title"
   - **Default commit description:** "Pull request title and description"

5. Click **Save**

---

## Testing the Protection

### Test 1: Direct Push (Should Fail)

Try pushing directly to main:

```bash
git checkout main
git commit --allow-empty -m "test: direct push"
git push origin main
```

**Expected result:** ❌ Push rejected with message:
```
remote: error: GH006: Protected branch update failed for refs/heads/main.
```

### Test 2: Pull Request (Should Work)

Create a PR from a feature branch:

```bash
git checkout -b test/branch-protection
git commit --allow-empty -m "test: branch protection"
git push origin test/branch-protection
```

Then create a PR on GitHub. You should see:
- ✅ CI checks running
- ✅ Approval required before merge
- ✅ Status checks must pass

### Test 3: Force Push (Should Fail)

Try force pushing:

```bash
git push origin main --force
```

**Expected result:** ❌ Push rejected

---

## Workflow Integration

With these settings, the development workflow becomes:

1. **Create feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make changes and commit**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

3. **Push to remote**
   ```bash
   git push origin feature/my-feature
   ```

4. **Create Pull Request** on GitHub
   - Fill out the PR template
   - Wait for CI checks to pass
   - Request review (if applicable)

5. **Merge PR** (after approval and passing checks)
   - Use "Squash and merge" for clean history
   - Branch automatically deleted after merge

6. **Update local main**
   ```bash
   git checkout main
   git pull origin main
   git branch -d feature/my-feature  # Delete local branch
   ```

---

## Troubleshooting

### Status Checks Not Appearing

**Problem:** Can't find `validate (18.x)` or `validate (20.x)` in status checks list.

**Solution:**
1. Wait for the CI workflow to run at least once on a PR or push
2. After it completes, return to branch protection settings
3. The status checks should now appear in the search

### Can't Push Even with PR

**Problem:** PR created but can't push new commits.

**Solution:**
- Push to your feature branch, not `main`
- The PR will automatically update with new commits

### Administrator Can't Merge

**Problem:** Even as admin, can't bypass protection rules.

**Solution:**
- This is intentional if "Do not allow bypassing" is enabled
- Either:
  1. Wait for status checks to pass, or
  2. Temporarily disable the rule (not recommended)

---

## Summary Checklist

After completing this setup, verify:

- [ ] Branch protection rule created for `main`
- [ ] Pull request reviews required (1+ approval)
- [ ] Status checks required: `validate (18.x)`, `validate (20.x)`, `Security Audit`
- [ ] Branches must be up to date before merging
- [ ] Linear history enforced
- [ ] Force pushes disabled
- [ ] Branch deletions disabled
- [ ] Auto-delete head branches enabled
- [ ] Squash merging configured
- [ ] Tested direct push (should fail)
- [ ] Tested PR workflow (should succeed)

---

## References

- [GitHub Docs: Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub Docs: Required Status Checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#require-status-checks-before-merging)
- [Project CONTRIBUTING.md](../CONTRIBUTING.md)

---

**Questions?** Open an issue or check the [GitHub documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches).
