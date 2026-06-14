# Anniversary Memory Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve anniversary browsing and detail interaction with correct past-date labels, occurrence counts, grouped lists, compact detail content, direct background replacement, and quick memory creation links.

**Architecture:** Keep date and grouping rules as pure functions in `utils/anniversary.js`, expose grouped page data through the existing anniversary service, and keep pages focused on interaction and rendering. Reuse the existing `coverImage` and `backgroundColor` fields, cloud storage uploader, and anniversary save path.

**Tech Stack:** WeChat mini-program native Page/WXML/WXSS, CommonJS, Node.js built-in test runner.

---

### Task 1: Anniversary display rules

**Files:**
- Modify: `utils/anniversary.js`
- Modify: `tests/anniversaryLunar.test.js`

- [x] Add failing tests for past countdown text, yearly occurrence count, and upcoming/past grouping.
- [x] Run `node --test tests/anniversaryLunar.test.js` and verify the new assertions fail.
- [x] Add `formatCountdownText`, `getOccurrenceCount`, and `groupAnniversaries`.
- [x] Include `occurrenceCount` and `occurrenceText` in decorated anniversaries.
- [x] Run `node --test tests/anniversaryLunar.test.js` and verify it passes.

### Task 2: Grouped anniversary list

**Files:**
- Modify: `services/anniversary.js`
- Modify: `pages/anniversary/anniversary.js`
- Modify: `pages/anniversary/anniversary.wxml`
- Modify: `pages/anniversary/anniversary.wxss`

- [x] Return `upcomingList` and `pastList` from anniversary page data.
- [x] Store both groups in page state.
- [x] Render separate “即将到来” and “已经过去” sections.
- [x] Remove inline edit and delete actions from normal list cards.
- [x] Display occurrence text for yearly anniversaries.
- [x] Run anniversary tests and syntax checks.

### Task 3: Compact anniversary detail

**Files:**
- Modify: `pages/anniversary-detail/anniversary-detail.js`
- Modify: `pages/anniversary-detail/anniversary-detail.wxml`
- Modify: `pages/anniversary-detail/anniversary-detail.wxss`

- [x] Replace the oversized count hero with a compact information hierarchy.
- [x] Remove the duplicated detail card.
- [x] Add the “记录新的回忆” card with links to album compose and mailbox compose.
- [x] Keep cover preview available when tapping outside the background button.
- [x] Run syntax checks.

### Task 4: Detail background replacement

**Files:**
- Modify: `pages/anniversary-detail/anniversary-detail.js`
- Modify: `pages/anniversary-detail/anniversary-detail.wxml`
- Modify: `pages/anniversary-detail/anniversary-detail.wxss`
- Create: `tests/anniversaryDetailBackground.test.js`

- [x] Add a failing static regression test for background controls and event isolation.
- [x] Run `node --test tests/anniversaryDetailBackground.test.js` and verify it fails.
- [x] Add a compact background panel with preset colors, photo selection, and photo removal.
- [x] Upload local photos through `services/cloud-storage.js` and save through `services/anniversary.js`.
- [x] Preserve the current detail on failure and show an error toast.
- [x] Run the new regression test and verify it passes.

### Task 5: Verification

**Files:**
- Verify all modified files.

- [x] Run `node --test tests/*.test.js`.
- [x] Run `node --check` on modified JavaScript files.
- [x] Inspect the final diff for accidental unrelated changes.
