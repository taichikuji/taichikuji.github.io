---
title: How to Squash Commits in Git After Push
slug: squash-commits-after-push
date: 2026-08-03
summary: How to combine commits after they have already been pushed to a remote repository.
tags:
  - git
  - version-control
  - documentation
draft: false
---

## Introduction

This guide explains how to combine, or squash, multiple Git commits into a single commit after they have already been pushed to a remote repository.

Rebasing pushed commits changes the repository history. Do not use this on a shared branch if anyone else may have based work on its current history, because rewriting it can disrupt their work.

## The short version

Squash the last four commits with:

```bash
git rebase -i HEAD~4
```

Here, `~4` selects the last four commits.

Then update the remote branch safely:

```bash
git push --force-with-lease origin <branch>
```

## Steps

### 1. Start an interactive rebase

Open a terminal and run the rebase command. Replace `N` with the number of commits you want to review, such as `4` for the last four commits.

```bash
git rebase -i HEAD~N
# Or rebase commits after a specific upstream point
git rebase -i origin/master
```

### 2. Mark commits to squash

Your default text editor will open with a list of commits:

```text
pick 1fc6c95 New feature A
squash 6b2481b Fix typo in A
squash dd1475d Fix bug in A
```

Keep the first commit as `pick`. Change the following commits that you want to combine from `pick` to `squash`, or `s` for short. Save and close the file.

### 3. Update the commit message

A new editor window will open so you can edit the commit message for the combined commit. Change it as needed, then save and close the file.

### 4. Force-push the changes

Since the history has been rewritten, a standard push may be rejected. Use `--force-with-lease` so the push fails if the remote branch has changed since you last fetched it:

```bash
git push --force-with-lease origin <branch>
```

Source: [Stack Overflow](https://stackoverflow.com/questions/5667884/how-to-squash-commits-in-git-after-they-have-been-pushed).

